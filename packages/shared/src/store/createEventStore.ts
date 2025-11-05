import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EventItem, Task, StorageAdapter, EventCategory, Comment } from "../types";
import { getCountdownObject } from "../utils/getCountdown";
import { supabase } from "../lib/supabase";

type EventState = {
  events: EventItem[];
  moments: any[]; // Flat array of moments for easier subscription
  tasks: any[]; // Flat array of tasks for easier subscription
  notifications?: any[];
  addEvent: (
    input: Omit<EventItem, "id" | "tasks"> & { tasks?: Task[] }
  ) => Promise<void>;
  updateEvent: (id: string, updates: Partial<EventItem>) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  addTask: (eventId: string, taskText: string, owner?: string, completionDate?: string, reminderEnabled?: boolean) => Promise<void>;
  toggleTask: (taskId: string, eventId: string) => void;
  updateTask: (eventId: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  removeTask: (eventId: string, taskId: string) => Promise<void>;
  getAllTasks: () => (Task & { eventId: string; eventTitle: string; eventCategory: EventCategory })[];
  getActiveTasks?: () => (Task & { eventId: string; eventTitle: string; eventCategory: EventCategory })[];
  addComment: (eventId: string, comment: Comment) => Promise<void>;
  removeComment: (eventId: string, commentId: string) => Promise<void>;
  updateReflection: (momentId: string, reflection: { text?: string; photoUrl?: string }) => Promise<void>;
  checkPastMoments: () => void;
  updateMoment: (updatedMoment: Partial<EventItem> & { id: string }) => Promise<void>;
  checkUpcomingEvents: () => void;
  checkUpcomingTasks: () => void;
  fetchMoments: (userId: string) => Promise<void>;
  fetchNotifications?: (userEmail: string) => Promise<void>;
  fetchTasks: (userId: string) => Promise<void>;
  reset: () => void;
  shareMoment: (momentId: string, emails: string[]) => Promise<{ success: boolean; count: number; total: number; message: string }>;
  acceptMoment: (momentId: string, userEmail: string) => Promise<void>;
  declineMoment: (momentId: string, userEmail: string) => Promise<void>;
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Reminder notification functions
const showNotification = (event: EventItem) => {
  const Notif = (typeof globalThis !== 'undefined' ? (globalThis as any).Notification : undefined);
  if (Notif && Notif.permission === 'granted') {
    try {
      const countdown = getCountdownObject(event.date);
      // Wrap in try/catch to avoid crashes in restricted environments
      new Notif('⏰ Upcoming Event Reminder', {
        body: `${event.title} is happening in ${countdown.days} days!`,
        icon: '/favicon.ico',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Notification blocked:', err);
    }
  } else if (Notif && Notif.permission === 'default') {
    // no-op in production to avoid noisy logs
  }
};

const showTaskNotification = (task: Task, event: EventItem) => {
  const Notif = (typeof globalThis !== 'undefined' ? (globalThis as any).Notification : undefined);
  if (Notif && Notif.permission === 'granted') {
    try {
      const countdown = getCountdownObject(task.completionDate!);
      new Notif('⏰ Task Due Soon', {
        body: `${task.text} (${event.title}) is due in ${countdown.days} day(s)!`,
        icon: '/favicon.ico',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Notification blocked:', err);
    }
  } else {
    // no-op in production to avoid noisy logs
  }
};

const checkUpcomingEvents = (events: EventItem[]) => {
  events.forEach((event) => {
    const countdown = getCountdownObject(event.date);
    const reminderDays = event.reminderDays || 3; // Default to 3 days if not set
    // Trigger notification if event is within reminder days and not past
    if (countdown.days <= reminderDays && countdown.days >= 0) {
      showNotification(event);
    }
  });
};

const checkUpcomingTasks = (events: EventItem[]) => {
  events.forEach((event) => {
    event.tasks.forEach((task) => {
      if (!task.completionDate || task.done || task.notified || !task.reminderEnabled) return;

      const countdown = getCountdownObject(task.completionDate);
      if (countdown.days <= 1 && countdown.days >= 0) {
        showTaskNotification(task, event);
        // Mark task as notified to prevent duplicate reminders
        task.notified = true;
      }
    });
  });
};

export function createEventStore(storage: StorageAdapter) {
  const storageWrapper = {
    getItem: (name: string) => {
      const v = storage.getItem(name) as any;
      if (v && typeof (v as any).then === "function") {
        return (v as Promise<string | null>).then((value) => value ?? null);
      }
      return (v as string | null) ?? null;
    },
    setItem: (name: string, value: string) => {
      const r = storage.setItem(name, value) as any;
      if (r && typeof r.then === "function") return r as Promise<void>;
    },
    removeItem: (name: string) => {
      const fn = storage.removeItem?.bind(storage);
      const r = fn ? (fn(name) as any) : undefined;
      if (r && typeof r.then === "function") return r as Promise<void>;
    }
  };

  return create<EventState>()(
    persist(
      (set, get) => ({
        events: [],
        moments: [],
        tasks: [],
        fetchMoments: async (userId: string) => {
          if (!userId || !supabase?.from) return;
          try {
            
            // Get current user email to check invitation status
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email?.toLowerCase().trim();
            
            // Fetch moments owned by the user OR shared_with contains the user's email
            const query = supabase
              .from("moments")
              .select(`
                *,
                preparations (*),
                comments (*)
              `)
              .order("created_at", { ascending: false });

            // Apply OR filter when we have the email; otherwise rely on RLS
            let data, error;
            if (userEmail) {
              ({ data, error } = await query.or(`user_id.eq.${userId},shared_with.cs.{${userEmail}}`));
            } else {
              ({ data, error } = await query);
            }
            
            if (error) {
              console.error("[fetchMoments] Supabase error:", error);
              return;
            }
            
            if (data) {
              
              // Transform Supabase data to EventItem format
              const transformedEvents = data
                .map((moment: any) => {
                  const taskCount = moment.preparations?.length || 0;
                  
                  // Determine if this moment is pending for the current user
                  const isOwner = moment.user_id === userId;
                  const sharedWithStatus = moment.shared_with_status || {};
                  
                  // Normalize email for lookup (same as in acceptMoment/declineMoment)
                  const normalizedEmail = userEmail ? userEmail.toLowerCase().trim() : null;
                  const userStatus = normalizedEmail ? sharedWithStatus[normalizedEmail] : null;
                  
                  // Check if user is in shared_with array (normalized)
                  const sharedWithArray = (moment.shared_with || []).map((e: string) => e.toLowerCase().trim());
                  const isSharedWithUser = normalizedEmail ? sharedWithArray.includes(normalizedEmail) : false;
                  
                  // Determine moment status
                  let momentStatus = moment.status || 'active';
                  if (!isOwner && normalizedEmail && isSharedWithUser) {
                    // If user is shared but hasn't accepted, it's pending
                    if (!userStatus || userStatus === 'pending') {
                      momentStatus = 'pending';
                    } else if (userStatus === 'declined') {
                      momentStatus = 'declined';
                    } else if (userStatus === 'accepted') {
                      momentStatus = 'active';
                    }
                  }
                  
                  const isPast = new Date(moment.date) < new Date();
                  const sharedWithMe = !isOwner && isSharedWithUser;
                  return {
                    id: moment.id,
                    name: moment.title,
                    title: moment.title,
                    date: moment.date,
                    description: moment.description,
                    category: moment.category || "personal",
                    status: momentStatus as any,
                    shared_with: moment.shared_with || [],
                    shared_with_status: moment.shared_with_status || {},
                    user_id: moment.user_id,
                    reflection: moment.reflection || undefined,
                    reflectionPhoto: moment.reflection_photo || undefined,
                    isPast: moment.is_past ?? isPast,
                    sharedWithMe,
                    tasks: (moment.preparations || []).map((prep: any) => ({
                      id: prep.id,
                      text: prep.text,
                      title: prep.text,
                      done: Boolean(prep.done ?? prep.is_done ?? prep.completed ?? prep.is_completed ?? false),
                      completed: Boolean(prep.done ?? prep.is_done ?? prep.completed ?? prep.is_completed ?? false),
                      owner: prep.owner,
                      completionDate: prep.completion_date || prep.completed_at || null,
                      notified: false,
                      reminderEnabled: prep.reminder_enabled ?? true
                    })),
                    comments: (moment.comments || []).map((comment: any) => ({
                      id: comment.id,
                      author: "",
                      content: comment.content,
                      timestamp: comment.created_at,
                      fileUrl: comment.file_url,
                      fileName: comment.file_name
                    })),
                    reminderDays: moment.reminder_days || 3,
                    createdAt: moment.created_at,
                    lastEdited: moment.updated_at || moment.created_at
                  };
                })
                // Filter out declined moments for shared users (owners always see them)
                .filter((moment: any) => {
                  const isOwner = moment.user_id === userId;
                  if (isOwner) return true; // Owners always see their moments
                  return moment.status !== 'declined';
                });
              
              const totalTasks = transformedEvents.reduce((sum, e) => sum + e.tasks.length, 0);
              
              // Update both events and moments state (preserve tasks)
              set((state) => ({
                events: transformedEvents,
                moments: transformedEvents, // Flat array for easy subscription
                tasks: state.tasks // Preserve existing tasks
              }));
              
            } else {
              
            }
          } catch (err) {
            console.error("[fetchMoments] Error fetching moments from Supabase:", err);
          }
        },
        fetchNotifications: async (userEmail: string) => {
          if (!userEmail || !supabase?.from) return;
          try {
            const normalized = userEmail.toLowerCase().trim();
            const { data, error } = await supabase
              .from("notifications")
              .select("*")
              .eq("recipient", normalized)
              .order("created_at", { ascending: false });
            if (error) {
              console.error("fetchNotifications error:", error);
              return;
            }
            set((state) => ({ ...state, notifications: data || [] }));
          } catch (err) {
            console.error("Unexpected error fetching notifications:", err);
          }
        },
        fetchTasks: async (userId: string) => {
          if (!userId || !supabase?.from) return;
          try {
            const { data, error } = await supabase
              .from("preparations")
              .select("*, moments(id, title, date)")
              .order("completion_date", { ascending: true });
            
            if (error) {
              console.error("[fetchTasks] Supabase error:", error);
              return;
            }
            
            
            // Update tasks state (preserve moments and events)
            set((state) => ({
              ...state,
              tasks: data || []
            }));
          } catch (err) {
            console.error("[fetchTasks] Error fetching tasks from Supabase:", err);
          }
        },
        shareMoment: async (momentId: string, emails: string[]) => {
          if (!supabase?.from) {
            return {
              success: false,
              count: 0,
              total: 0,
              message: "⚠️ Supabase not available"
            };
          }
          try {
            // Initialize shared_with_status with 'pending' for all new emails
            const { data: momentData } = await supabase
              .from("moments")
              .select("shared_with_status")
              .eq("id", momentId)
              .maybeSingle();
            
            const statusMap = momentData?.shared_with_status || {};
            emails.forEach((email: string) => {
              const normalizedEmail = email.toLowerCase().trim();
              if (!statusMap[normalizedEmail] || statusMap[normalizedEmail] === 'declined') {
                statusMap[normalizedEmail] = 'pending';
              }
            });
            
            const { data, error } = await supabase
              .from("moments")
              .update({ 
                shared_with: emails,
                shared_with_status: statusMap,
                status: 'active' // Owner's moments remain active
              })
              .eq("id", momentId)
              .select()
              .single();
            if (error) {
              console.error("Share moment error:", error);
              return {
                success: false,
                count: 0,
                total: 0,
                message: `❌ Failed to update moment: ${error.message}`
              };
            }
            if (data) {
              // Create notifications for all invited users
              const { data: currentUser } = await supabase.auth.getUser();
              const senderEmail = currentUser?.user?.email?.toLowerCase().trim();
              
              // Verify we have the sender email
              if (!senderEmail) {
                console.error("[shareMoment] Cannot create notifications - sender email is missing");
                console.error("[shareMoment] Current user:", currentUser);
              }
              
              
              if (senderEmail && emails.length > 0) {
                const notificationPromises = emails.map(async (email: string) => {
                  const normalizedEmail = email.toLowerCase().trim();
                  // Skip if sharing with yourself
                  if (normalizedEmail === senderEmail) {
                    return;
                  }
                  
                  try {
                    if (!supabase?.from) {
                      console.error(`[shareMoment] Supabase not available for notification creation`);
                      return;
                    }
                    
                    // Verify session before insert
                    const { data: sessionData } = await supabase.auth.getSession();
                    
                    if (!sessionData?.session) {
                      console.error(`[shareMoment] ❌ No active session - cannot insert notification`);
                      return;
                    }
                    
                    // Get the JWT payload to verify email claim
                    try {
                      const tokenParts = sessionData.session.access_token.split('.');
                      if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        void payload;
                      }
                    } catch (e) {
                      console.warn(`[shareMoment] Could not decode JWT:`, e);
                    }
                    
                    const notificationData = {
                      recipient: normalizedEmail,
                      sender: senderEmail,
                      message: `${currentUser.user?.email || senderEmail} invited you to collaborate on "${data.title || data.name || 'a Moment'}"`,
                      link: `/event/${momentId}`,
                      read: false
                    };
                    
                    
                    // Force refresh session to ensure it's valid
                    const { data: refreshedSession } = await supabase.auth.refreshSession();
                    if (refreshedSession?.session) {
                      // Explicitly set the session to ensure it's attached to subsequent requests
                      await supabase.auth.setSession({
                        access_token: refreshedSession.session.access_token,
                        refresh_token: refreshedSession.session.refresh_token
                      });
                    }
                    
                    // Get current session one more time right before insert
                    const { data: finalSession } = await supabase.auth.getSession();
                    
                    
                    // Try using RPC or raw fetch as fallback? Actually, let's try with explicit headers
                    // But first, let's see if we can verify the request is being made with auth
                    
                    // Try alternative: Use PostgREST client directly with explicit auth header
                    // This ensures the Authorization header is definitely sent
                    const { data: finalSessionForAuth } = await supabase.auth.getSession();
                    const accessToken = finalSessionForAuth?.session?.access_token;
                    
                    if (!accessToken) {
                      console.error(`[shareMoment] ❌ No access token available for insert`);
                      return;
                    }
                    
                    // Try using RPC function first (bypasses RLS)
                    let notifData: any = null;
                    let notifError: any = null;
                    let alternativeSuccess = false;
                    
                    try {
                      const { data: rpcData, error: rpcError } = await supabase.rpc('create_notification', {
                        p_recipient: notificationData.recipient,
                        p_sender: notificationData.sender,
                        p_message: notificationData.message,
                        p_link: notificationData.link
                      });
                      
                      if (rpcError) {
                        console.warn(`[shareMoment] RPC function failed or doesn't exist:`, rpcError.message);
                        // Fall back to direct insert
                        throw rpcError;
                      } else {
                        notifData = { id: rpcData, ...notificationData };
                        alternativeSuccess = true;
                      }
                    } catch (rpcErr) {
                      // RPC failed or doesn't exist, try direct insert
                      const insertResult = await supabase
                        .from("notifications")
                        .insert(notificationData)
                        .select()
                        .single();
                      
                      notifData = insertResult.data;
                      notifError = insertResult.error;
                      
                      // If direct insert fails, try raw fetch with explicit headers
                      if (notifError && notifError.code === '42501') {
                        try {
                          // Import supabaseUrl and supabaseAnonKey
                          const { supabaseUrl: url, supabaseAnonKey: key } = await import('../lib/supabase');
                          
                          if (!url || !key) {
                            console.error(`[shareMoment] Missing Supabase URL or key for alternative insert`);
                          } else {
                            const response = await fetch(
                              `${url}/rest/v1/notifications?select=*`,
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${accessToken}`,
                                  'apikey': key,
                                  'Prefer': 'return=representation'
                                },
                                body: JSON.stringify(notificationData)
                              }
                            );
                            
                            if (!response.ok) {
                              const errorText = await response.text();
                              console.error(`[shareMoment] Alternative insert failed:`, response.status, errorText);
                              try {
                                const headersObj: Record<string, string> = {} as any;
                                (response.headers as any).forEach((value: string, key: string) => {
                                  headersObj[key] = value;
                                });
                                console.error(`[shareMoment] Response headers:`, headersObj);
                              } catch {}
                            } else {
                              const data = await response.json();
                              alternativeSuccess = true;
                              notifData = Array.isArray(data) ? data[0] : data;
                              notifError = null;
                            }
                          }
                        } catch (fetchError) {
                          console.error(`[shareMoment] Exception in alternative insert:`, fetchError);
                        }
                      }
                    }
                    
                    // Only log error if alternative method also failed or wasn't tried
                    if (notifError && !alternativeSuccess) {
                      console.error(`[shareMoment] ❌ Failed to create notification for ${normalizedEmail}:`, notifError);
                      console.error(`[shareMoment] Error details:`, {
                        code: notifError.code,
                        message: notifError.message,
                        details: notifError.details,
                        hint: notifError.hint
                      });
                      
                      // Try to diagnose RLS issue
                      if (notifError.code === '42501' || notifError.message?.includes('policy')) {
                        console.error(`[shareMoment] ⚠️ This looks like an RLS policy issue. Run fix_notifications_policies.sql`);
                      }
                    } else {
                      
                      // Verification: Try to read it back (optional, mainly for debugging)
                      // Note: If SELECT policy blocks this, that's okay - the notification was created
                      const { data: verifyData, error: verifyError } = await supabase
                        .from("notifications")
                        .select("*")
                        .eq("id", notifData.id)
                        .single();
                      
                      if (verifyError) {
                        console.warn(`[shareMoment] ⚠️ Created notification but SELECT policy may block reading it back:`, verifyError.message);
                      } else {
                        void verifyData;
                      }
                    }
                  } catch (err) {
                    console.error(`[shareMoment] Exception creating notification for ${normalizedEmail}:`, err);
                  }
                });
                
                // Wait for all notifications to be created (don't block if they fail)
                const results = await Promise.allSettled(notificationPromises);
                
                // Count successful notifications
                const successful = results.filter(r => r.status === 'fulfilled').length;
                const total = results.length;
                
                return {
                  success: successful > 0,
                  count: successful,
                  total,
                  message: successful === total 
                    ? `✅ Invitations sent to ${successful} user${successful === 1 ? '' : 's'}! Email notifications will be sent automatically.`
                    : `⚠️ Sent ${successful} of ${total} invitations. ${total - successful} failed.`
                };
              } else {
                return {
                  success: false,
                  count: 0,
                  total: 0,
                  message: "⚠️ No recipients provided or sender email missing"
                };
              }
              
              set((s) => ({
                events: s.events.map((m) =>
                  m.id === momentId
                    ? {
                        ...m,
                        // keep local shape; no strict type for shared_with on EventItem
                        ...(data.shared_with ? { shared_with: data.shared_with } as any : {}),
                        ...(data.shared_with_status ? { shared_with_status: data.shared_with_status } as any : {})
                      }
                    : m
                )
              }));
              
              // Return success even if no notifications were created (moment was shared)
              return {
                success: true,
                count: 0,
                total: 0,
                message: "✅ Moment shared successfully"
              };
            } else {
              // data is null but no error - should not happen but handle gracefully
              return {
                success: false,
                count: 0,
                total: 0,
                message: "⚠️ Moment update succeeded but no data returned"
              };
            }
          } catch (err) {
            console.error("Unexpected error sharing moment:", err);
            return {
              success: false,
              count: 0,
              total: 0,
              message: `❌ Error sharing moment: ${err instanceof Error ? err.message : 'Unknown error'}`
            };
          }
        },
        acceptMoment: async (momentId: string, userEmail: string) => {
          if (!supabase?.from) {
            console.error("[acceptMoment] Supabase not available");
            throw new Error("Database connection not available");
          }
          try {
            // Normalize email to match shared_with format
            const normalizedEmail = userEmail.toLowerCase().trim();
            
            const { data: momentData, error: fetchError } = await supabase
              .from("moments")
              .select("*")
              .eq("id", momentId)
              .maybeSingle();
            if (fetchError) {
              console.error("[acceptMoment] fetch error:", fetchError);
              throw fetchError;
            }
            if (!momentData) {
              console.error("[acceptMoment] moment not found");
              throw new Error("Moment not found");
            }
            
            /*
            console.log("[acceptMoment] Moment data:", {
              id: momentData.id,
              title: momentData.title,
              status: momentData.status,
              shared_with_status: momentData.shared_with_status,
              user_id: momentData.user_id
            });
            */
            
            const { data: currentUser } = await supabase.auth.getUser();
            /*
            console.log("[acceptMoment] Current user:", {
              id: currentUser?.user?.id,
              email: currentUser?.user?.email
            });
            */
            
            const isOwner = momentData.user_id === currentUser?.user?.id;
            const normalizedEmailLower = normalizedEmail.toLowerCase();
            const sharedWithArray = (momentData.shared_with || []).map((e: string) => e.toLowerCase().trim());
            if (!isOwner && !sharedWithArray.includes(normalizedEmailLower)) {
              console.error("[acceptMoment] User not in shared_with array", {
                normalizedEmailLower,
                sharedWithArray
              });
              throw new Error("User not authorized for this moment");
            }
            
            const statusMap = momentData.shared_with_status || {};
            statusMap[normalizedEmailLower] = 'accepted';
            const updateData: any = {
              shared_with_status: statusMap,
              status: momentData.status === 'pending' ? 'active' : momentData.status
            };
            
            
            const { data: updateResult, error } = await supabase
              .from("moments")
              .update(updateData)
              .eq("id", momentId)
              .select()
              .single();
            if (error) {
              console.error("[acceptMoment] update error:", error);
              console.error("[acceptMoment] Error details:", {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
              });
              throw error;
            }
            
            
          } catch (err) {
            console.error("[acceptMoment] unexpected error:", err);
            throw err;
          }
        },
        declineMoment: async (momentId: string, userEmail: string) => {
          if (!supabase?.from) {
            console.error("[declineMoment] Supabase not available");
            throw new Error("Database connection not available");
          }
          try {
            // Normalize email to match shared_with format
            const normalizedEmail = userEmail.toLowerCase().trim();
            
            const { data: momentData, error: fetchError } = await supabase
              .from("moments")
              .select("*")
              .eq("id", momentId)
              .maybeSingle();
            if (fetchError) {
              console.error("[declineMoment] fetch error:", fetchError);
              throw fetchError;
            }
            if (!momentData) {
              console.error("[declineMoment] moment not found");
              throw new Error("Moment not found");
            }
            
            /*
            console.log("[declineMoment] Moment data:", {
              id: momentData.id,
              title: momentData.title,
              status: momentData.status,
              shared_with_status: momentData.shared_with_status,
              user_id: momentData.user_id
            });
            */
            
            const statusMap = momentData.shared_with_status || {};
            statusMap[normalizedEmail] = 'declined';
            
            
            const { data: updateResult, error } = await supabase
              .from("moments")
              .update({ shared_with_status: statusMap })
              .eq("id", momentId)
              .select()
              .single();
            if (error) {
              console.error("[declineMoment] update error:", error);
              console.error("[declineMoment] Error details:", {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
              });
              throw error;
            }
            
            
          } catch (err) {
            console.error("[declineMoment] unexpected error:", err);
            throw err;
          }
        },
        subscribeRealtime: () => {
          if (!supabase) return;
          const supabaseClient = supabase;
          try {
            const channel = (supabaseClient as any)
              .channel("realtime-moments")
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "moments" },
                (payload: any) => {
                  console.log("[Realtime] moment updated:", payload);
                  const updated = payload.new;
                  if (!updated?.id || !supabaseClient) return;
                  
                  // If status or shared_with_status changed, refetch to get accurate pending state
                  if (updated.status || updated.shared_with_status) {
                    supabaseClient.auth.getUser().then(({ data: userData }) => {
                      if (userData?.user?.id) {
                        get().fetchMoments(userData.user.id);
                      }
                    });
                    return;
                  }
                  
                  // Otherwise, just update the moment in place
                  set((s) => ({
                    events: s.events.map((m) =>
                      m.id === updated.id
                        ? {
                            ...m,
                            title: updated.title ?? m.title,
                            name: updated.title ?? m.name,
                            description: updated.description ?? m.description,
                            date: updated.date ?? m.date,
                            category: updated.category ?? m.category,
                            ...(updated.shared_with ? { shared_with: updated.shared_with } as any : {}),
                            ...(updated.shared_with_status ? { shared_with_status: updated.shared_with_status } as any : {}),
                            ...(updated.status ? { status: updated.status } as any : {})
                          }
                        : m
                    )
                  }));
                }
              )
              .subscribe();
            return channel;
          } catch (err) {
            console.error("Realtime subscribe error:", err);
          }
        },
        addEvent: async (input) => {
          // Sync to Supabase first; only update local state on success
          if (supabase?.from) {
            try {
              const { data: userData } = await supabase.auth.getUser();
              const userId = userData?.user?.id;
              if (!userId) return;

              const insertPayload: any = {
                title: (input as any).title ?? (input as any).name ?? "",
                description: input.description,
                date: input.date,
                category: (input as any).category ?? "personal",
                user_id: userId
              };

              const { data, error } = await supabase
                .from("moments")
                .insert(insertPayload)
                .select()
                .single();

              if (error) {
                console.error("Error inserting moment:", error);
                return;
              }

              const created = data as any;
              const newEvent = {
                id: created.id,
                name: created.title,
                title: created.title,
                date: created.date,
                description: created.description,
                category: created.category || "personal",
                tasks: (input.tasks ?? []),
                notes: (input as any).notes,
                reminderDays: (input as any).reminderDays ?? 3,
                lastEdited: created.created_at || new Date().toISOString()
              };

              set((state) => ({ events: [...state.events, newEvent] }));
            } catch (err) {
              console.error("Unexpected error inserting moment:", err);
            }
            return;
          }

          // Fallback local-only (no Supabase)
          const localEvent = {
            id: generateId(),
            name: (input as any).name ?? (input as any).title ?? "",
            title: (input as any).title ?? (input as any).name ?? "",
            date: input.date,
            description: input.description,
            category: (input as any).category ?? "personal",
            tasks: input.tasks ?? [],
            notes: input.notes,
            reminderDays: (input as any).reminderDays ?? 3,
            lastEdited: new Date().toISOString()
          };
          set((state) => ({ events: [...state.events, localEvent] }));
        },
        updateEvent: async (id, updates) => {
          const updatedEvent = {
            ...updates,
            name: (updates as any).name ?? (updates as any).title ?? "",
            title: (updates as any).title ?? (updates as any).name ?? "",
            lastEdited: new Date().toISOString()
          };

          // Sync to Supabase first
          if (supabase?.from) {
            try {
              const supabaseUpdate: any = {};
              if (updatedEvent.title) supabaseUpdate.title = updatedEvent.title;
              if (updatedEvent.description !== undefined) supabaseUpdate.description = updatedEvent.description;
              if (updatedEvent.date) supabaseUpdate.date = updatedEvent.date;
              if (updatedEvent.category) supabaseUpdate.category = updatedEvent.category;

              const { error } = await supabase
                .from("moments")
                .update(supabaseUpdate)
                .eq("id", id);

              if (error) {
                console.error("Error updating moment:", error);
                return;
              }
            } catch (err) {
              console.error("Unexpected error updating moment:", err);
              return;
            }
          }

          // Update local state after success or when offline
          set((state) => ({
            events: state.events.map((e) =>
              e.id === id
                ? {
                    ...e,
                    ...(updatedEvent.title ? { title: updatedEvent.title, name: updatedEvent.title } : {}),
                    ...(updatedEvent.description !== undefined ? { description: updatedEvent.description } : {}),
                    ...(updatedEvent.category ? { category: updatedEvent.category } : {}),
                    ...(updatedEvent.date ? { date: updatedEvent.date } : {}),
                    lastEdited: updatedEvent.lastEdited
                  }
                : e
            )
          }));
        },
        removeEvent: async (id) => {
          // Delete from Supabase first when available
          if (supabase?.from) {
            try {
              const { error } = await supabase.from("moments").delete().eq("id", id);
              if (error) {
                console.error("Error deleting moment:", error);
                return;
              }
            } catch (err) {
              console.error("Unexpected error deleting moment:", err);
              return;
            }
          }

          // Update local state after success or when offline
          set((state) => ({
            events: state.events.filter((e) => e.id !== id)
          }));
        },
        addTask: async (eventId, taskText, owner, completionDate, reminderEnabled) => {
          // Insert first, then update local
          if (supabase?.from) {
            try {
              const { data, error } = await supabase
                .from("preparations")
                .insert({
                  moment_id: eventId,
                  text: taskText,
                  owner: owner,
                  completion_date: completionDate,
                  reminder_enabled: reminderEnabled ?? true,
                  done: false
                })
                .select()
                .single();

              if (error) {
                console.error("Error inserting preparation:", error);
                return;
              }

              const created = data as any;
              const newTask = {
                id: created.id,
                text: created.text,
                title: created.text,
                owner: created.owner || undefined,
                completionDate: created.completion_date || undefined,
                done: created.done || false,
                completed: created.done || false,
                notified: false,
                reminderEnabled: created.reminder_enabled ?? true
              };

              set((state) => ({
                events: state.events.map((e) =>
                  e.id === eventId
                    ? { ...e, tasks: [...e.tasks, newTask].sort((a, b) => {
                        if (!a.completionDate) return 1;
                        if (!b.completionDate) return -1;
                        return new Date(a.completionDate).getTime() - new Date(b.completionDate).getTime();
                      }) }
                    : e
                )
              }));
            } catch (err) {
              console.error("Unexpected error inserting preparation:", err);
            }
            return;
          }

          // Fallback local-only
          const localTask = {
            id: generateId(),
            text: taskText,
            title: taskText,
            owner: owner || undefined,
            completionDate: completionDate || undefined,
            done: false,
            completed: false,
            notified: false,
            reminderEnabled: reminderEnabled ?? true
          };
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId
                ? { ...e, tasks: [...e.tasks, localTask] }
                : e
            )
          }));
        },
        toggleTask: (taskId, eventId) => {
          const state = get();
          const event = state.events.find((e) => e.id === eventId);
          const task = event?.tasks.find((t) => t.id === taskId);
          if (!task) return;
          const nextDone = !Boolean(task.done);
          const nextCompletionDate = nextDone ? new Date().toISOString() : undefined;

          // Log intent
          console.log("[toggleTask] local flip", { taskId, eventId, nextDone, nextCompletionDate });

          // Optimistic update
          set((s) => ({
            events: s.events.map((e) =>
              e.id === eventId
                ? {
                    ...e,
                    tasks: e.tasks.map((t) =>
                      t.id === taskId
                        ? {
                            ...t,
                            done: nextDone,
                    completionDate: nextCompletionDate,
                          }
                        : t
                    )
                  }
                : e
            )
          }));

          // Persist
          if (supabase?.from) {
            (async () => {
              try {
                const { data, error, status } = await supabase
                  .from("preparations")
                  .update({
                    done: nextDone,
                    completion_date: nextDone ? nextCompletionDate! : null,
                  })
                  .eq("id", taskId)
                  .select("id, done, completion_date")
                  .single();
                if (error) {
                  console.error("[toggleTask] error:", error);
                  // Revert optimistic on error
                  set((s) => ({
                    events: s.events.map((e) =>
                      e.id === eventId
                        ? {
                            ...e,
                            tasks: e.tasks.map((t) =>
                              t.id === taskId
                                ? {
                                    ...t,
                                    done: !nextDone,
                                    completionDate: !nextDone ? task.completionDate ?? undefined : undefined,
                                  }
                                : t
                            )
                          }
                        : e
                    )
                  }));
                }
                console.log("[toggleTask] persisted:", { status, data });
                // Sync flat tasks list if present
                if (data) {
                  set((s) => ({
                    ...s,
                    tasks: (s.tasks || []).map((t: any) =>
                      t.id === taskId
                        ? { ...t, done: Boolean(data.done), completion_date: data.completion_date }
                        : t
                    )
                  }));
                  // Force refresh of moments/tasks to avoid stale state
                  try {
                    const { data: u } = await supabase.auth.getUser();
                    const uid = u?.user?.id;
                    if (uid) {
                      await get().fetchMoments(uid);
                    }
                  } catch (refreshErr) {
                    console.warn('[toggleTask] refresh failed:', refreshErr);
                  }
                }
              } catch (err) {
                console.error("[toggleTask] unexpected:", err);
                // Revert optimistic on exception
                set((s) => ({
                  events: s.events.map((e) =>
                    e.id === eventId
                      ? {
                          ...e,
                          tasks: e.tasks.map((t) =>
                            t.id === taskId
                              ? {
                                  ...t,
                                  done: !nextDone,
                                  completionDate: !nextDone ? task.completionDate ?? undefined : undefined,
                                }
                              : t
                          )
                        }
                      : e
                  )
                }));
              }
            })();
          }
        },
        updateTask: async (eventId, taskId, updates) => {
          const updatedTask = {
            ...updates,
            // keep title/text and completed/done in sync when provided
            title: (updates as any).title ?? (updates as any).text,
            text: (updates as any).text ?? (updates as any).title
          };
          
          // Sync first
          if (supabase?.from) {
            try {
              const { error } = await supabase
                .from("preparations")
                .update({
                  text: updatedTask.text,
                  owner: updatedTask.owner,
                  completion_date: updatedTask.completionDate,
                  done: (updatedTask as any).done ?? (updatedTask as any).completed,
                  reminder_enabled: updatedTask.reminderEnabled
                })
                .eq("id", taskId);

              if (error) {
                console.error("Error updating preparation:", error);
                return;
              }
            } catch (err) {
              console.error("Unexpected error updating preparation:", err);
              return;
            }
          }

          // Update local after success or when offline
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId
                ? {
                    ...e,
                    tasks: e.tasks.map((t) =>
                      t.id === taskId
                        ? { ...t, ...updatedTask }
                        : t
                    )
                  }
                : e
            )
          }));
        },
        removeTask: async (eventId, taskId) => {
          // Delete from Supabase first when available
          if (supabase?.from) {
            try {
              const { error } = await supabase.from("preparations").delete().eq("id", taskId);
              if (error) {
                console.error("Error deleting preparation:", error);
                return;
              }
            } catch (err) {
              console.error("Unexpected error deleting preparation:", err);
              return;
            }
          }

          // Update local state after success or when offline
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId
                ? { ...e, tasks: e.tasks.filter((t) => t.id !== taskId) }
                : e
            )
          }));
        },
        getAllTasks: () => {
          const state = get();
          // Try to get from nested events first, fallback to flat tasks array
          const fromEvents = state.events.flatMap((event: EventItem) =>
            event.tasks.map((task: Task) => ({
              ...task,
              eventId: event.id,
              eventTitle: event.title || event.name || "",
              eventCategory: event.category
            }))
          );
          
          // If events have tasks, use those (they include moment info)
          if (fromEvents.length > 0) {
            return fromEvents;
          }
          
          // Otherwise, use flat tasks array if available
          const fromFlatTasks = (state as any).tasks || [];
          return fromFlatTasks.map((task: any) => ({
            ...task,
            eventId: task.moment_id || task.moments?.id || "",
            eventTitle: task.moments?.title || "",
            eventCategory: "personal" as EventCategory,
            completionDate: task.completion_date,
            done: task.done || false,
            completed: task.done || false,
            text: task.text || task.title
          }));
        },
        getActiveTasks: () => {
          const state = get();
          const today = new Date();
          // Prefer nested events to ensure we have isPast on moments
          const tasksFromEvents = state.events
            .filter((m) => !((m as any).isPast || new Date(m.date) < today))
            .flatMap((event: EventItem) =>
              event.tasks.map((task: Task) => ({
                ...task,
                eventId: event.id,
                eventTitle: event.title || event.name || "",
                eventCategory: event.category
              }))
            )
            .filter((t) => !t.done && !t.completed);

          if (tasksFromEvents.length > 0) return tasksFromEvents;

          // Fallback to flat tasks array joined with moments by id
          const flat = (state as any).tasks || [];
          const activeMomentIds = new Set(
            (state.moments || state.events).filter((m: any) => new Date(m.date) >= today).map((m: any) => m.id)
          );
          return flat
            .filter((t: any) => activeMomentIds.has(t.moment_id || t.moments?.id))
            .map((task: any) => ({
              ...task,
              eventId: task.moment_id || task.moments?.id || "",
              eventTitle: task.moments?.title || "",
              eventCategory: "personal" as EventCategory,
              completionDate: task.completion_date,
              done: task.done || false,
              completed: task.done || false,
              text: task.text || task.title
            }))
            .filter((t: any) => !t.done && !t.completed);
        },
        addComment: async (eventId, comment) => {
          // Insert first
          if (supabase?.from) {
            try {
              const { data, error } = await supabase
                .from("comments")
                .insert({
                  moment_id: eventId,
                  content: comment.content,
                  file_url: (comment as any).fileUrl,
                  file_name: (comment as any).fileName
                })
                .select()
                .single();

              if (error) {
                console.error("Error inserting comment:", error);
                return;
              }

              const created = data as any;
              const newComment = {
                id: created.id,
                author: "",
                content: created.content,
                timestamp: created.created_at,
                fileUrl: created.file_url || undefined,
                fileName: created.file_name || undefined
              };

              set((state) => ({
                events: state.events.map((e) =>
                  e.id === eventId
                    ? { ...e, comments: [...(e.comments ?? []), newComment] }
                    : e
                )
              }));
            } catch (err) {
              console.error("Unexpected error inserting comment:", err);
            }
            return;
          }

          // Fallback local-only
          const localComment = { ...comment, id: comment.id || generateId() } as any;
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId
                ? { ...e, comments: [...(e.comments ?? []), localComment] }
                : e
            )
          }));
        },
        removeComment: async (eventId, commentId) => {
          // Delete first
          if (supabase?.from) {
            try {
              const { error } = await supabase.from("comments").delete().eq("id", commentId);
              if (error) {
                console.error("Error deleting comment:", error);
                return;
              }
            } catch (err) {
              console.error("Unexpected error deleting comment:", err);
              return;
            }
          }

          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId
                ? {
                    ...e,
                    comments: (e.comments || []).filter((c) => c.id !== commentId)
                  }
                : e
            )
          }));
        },
        updateReflection: async (momentId, reflection) => {
          // Update locally first for instant feedback
          set((state) => ({
            events: state.events.map((e) =>
              e.id === momentId
                ? { ...e, reflection: reflection.text ?? e.reflection, reflectionPhoto: reflection.photoUrl ?? e.reflectionPhoto }
                : e
            )
          }));

          // Sync to Supabase when available
          if (supabase?.from) {
            try {
              const { error } = await supabase
                .from("moments")
                .update({
                  reflection: reflection.text ?? null,
                  reflection_photo: reflection.photoUrl ?? null
                })
                .eq("id", momentId);
              if (error) {
                console.error("Error updating reflection:", error);
              }
            } catch (err) {
              console.error("Unexpected error updating reflection:", err);
            }
          }
        },
        checkPastMoments: () => {
          const today = new Date();
          set((state) => ({
            events: state.events.map((m) => ({
              ...m,
              isPast: new Date(m.date) < today
            })),
            moments: (state.moments || []).map((m: any) => ({
              ...m,
              isPast: new Date(m.date) < today
            }))
          }));
        },
        updateMoment: async (updatedMoment) => {
          const isPast = new Date(updatedMoment.date || "") < new Date();
          set((state) => ({
            events: state.events.map((m) =>
              m.id === updatedMoment.id ? { ...m, ...updatedMoment, isPast } : m
            ),
            moments: (state.moments || []).map((m: any) =>
              m.id === updatedMoment.id ? { ...m, ...updatedMoment, isPast } : m
            )
          }));

          if (supabase?.from) {
            try {
              const payload: any = {};
              if (updatedMoment.title !== undefined) payload.title = updatedMoment.title;
              if (updatedMoment.description !== undefined) payload.description = updatedMoment.description;
              if (updatedMoment.date !== undefined) payload.date = updatedMoment.date;
              if ((updatedMoment as any).category !== undefined) payload.category = (updatedMoment as any).category;
              payload.is_past = isPast;
              const { error } = await supabase
                .from("moments")
                .update(payload)
                .eq("id", updatedMoment.id);
              if (error) console.error("updateMoment error:", error);
            } catch (err) {
              console.error("Unexpected error updating moment:", err);
            }
          }
        },
        checkUpcomingEvents: () => {
          const state = get();
          checkUpcomingEvents(state.events);
        },
        checkUpcomingTasks: () => {
          const state = get();
          checkUpcomingTasks(state.events);
        },
        reset: () => {
          set({ events: [], moments: [], tasks: [] });
        }
      }),
      {
        name: "moments-store",
        storage: storageWrapper as any
      }
    )
  );
}

export type EventStore = ReturnType<typeof createEventStore>;