import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { getCountdown, daysUntil, useAuthStore } from "@moments/shared";
import { useEventStore } from "../store/useEventStore";
import { EventCategory } from "@moments/shared";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing } from "lucide-react";

const CATEGORIES: { id: EventCategory; label: string; emoji: string; color: string; gradient: string }[] = [
  { id: "birthday", label: "Birthday", emoji: "🎂", color: "bg-pink-200", gradient: "from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30" },
  { id: "work", label: "Work / Meeting", emoji: "💼", color: "bg-blue-200", gradient: "from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30" },
  { id: "travel", label: "Travel", emoji: "🌍", color: "bg-teal-200", gradient: "from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30" },
  { id: "education", label: "Education", emoji: "🎓", color: "bg-indigo-200", gradient: "from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30" },
  { id: "personal", label: "Personal", emoji: "❤️", color: "bg-rose-200", gradient: "from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30" }
];

function getCategoryInfo(category: EventCategory) {
  return CATEGORIES.find(cat => cat.id === category) || CATEGORIES[4];
}

function getTaskCountdownColor(daysLeft: number) {
  if (daysLeft < 3) return "text-red-600";
  if (daysLeft <= 10) return "text-yellow-500";
  return "text-green-600";
}

export function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // ✅ Subscribe to Zustand store keys (triggers re-render when tasks update)
  const events = useEventStore((s) => s.events);
  const moments = useEventStore((s) => (s as any).moments || []);
  const tasks = useEventStore((s) => (s as any).tasks || []);
  const getAllTasks = useEventStore((s) => s.getAllTasks);
  const getActiveTasks = useEventStore((s: any) => s.getActiveTasks);
  const checkUpcomingEvents = useEventStore((s) => s.checkUpcomingEvents);
  const checkUpcomingTasks = useEventStore((s) => s.checkUpcomingTasks);
  const fetchMoments = useEventStore((s) => s.fetchMoments);
  const fetchTasks = useEventStore((s) => (s as any).fetchTasks);
  const shareMoment = useEventStore((s) => (s as any).shareMoment);
  const acceptMoment = useEventStore((s) => (s as any).acceptMoment);
  const declineMoment = useEventStore((s) => (s as any).declineMoment);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<any>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [processingMomentId, setProcessingMomentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Dashboard filter state (All / My Moments / Shared with Me)
  const [momentFilter, setMomentFilter] = useState<"all" | "mine" | "shared">("all");
  
  // Notifications are now handled in the top bar (App.tsx)
  
  // ✅ Fetch moments and tasks right after login
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log("[Home] User detected, fetching moments & tasks...", user.id);
    
    // Fetch both moments and tasks
    Promise.all([
      fetchMoments(user.id),
      fetchTasks ? fetchTasks(user.id) : Promise.resolve()
    ])
      .then(() => {
        console.log("[Home] Moments and tasks loaded successfully");
        setLoading(false);
      })
      .catch((err) => {
        console.error("[Home] Error fetching data:", err);
        setLoading(false);
      });
  }, [user?.id]);
  
  // ✅ Fallback: If moments loaded but tasks empty, retry once
  useEffect(() => {
    if (user?.id && moments.length > 0 && tasks.length === 0 && !loading && fetchTasks) {
      console.log("[Home] Moments loaded but tasks empty — refetching tasks...");
      fetchTasks(user.id);
    }
  }, [user?.id, moments.length, tasks.length, loading, fetchTasks]);
  
  // (Removed local bell + dropdown; top bar will host notifications)
  
  // Category filter state
  const categories = ['all', 'work', 'travel', 'birthday', 'education', 'personal'];
  const [filter, setFilter] = useState<'all' | EventCategory>('all');
  
  // Owner filter state
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'none' | string>('all');
  
  // Sorting state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Periodic reminder check
  useEffect(() => {
    const interval = setInterval(() => {
      checkUpcomingEvents();
      checkUpcomingTasks();
    }, 60000); // Check every minute
    
    // Initial check on load
    checkUpcomingEvents();
    checkUpcomingTasks();
    
    return () => clearInterval(interval);
  }, [checkUpcomingEvents, checkUpcomingTasks]);

  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events]
  );

  const isPast = (m: any) => !!(m as any).isPast || new Date(m.date) < new Date();

  const upcomingTasks = useMemo(() => {
    // Prefer store-provided active tasks (filters out past moments)
    const base = typeof getActiveTasks === 'function' ? getActiveTasks() : getAllTasks();
    const today = new Date();
    const active = base.filter((t: any) => {
      const event = events.find((e) => e.id === (t as any).eventId);
      const isPastMoment = event ? ((event as any).isPast || new Date(event.date) < today) : false;
      return !isPastMoment && !(t.done || t.completed);
    });
    console.log("[Home] Computing upcomingTasks (active moments only), total:", active.length);
    return active
      .sort((a: any, b: any) => {
        if (!a.completionDate) return 1;
        if (!b.completionDate) return -1;
        return new Date(a.completionDate).getTime() - new Date(b.completionDate).getTime();
      })
      .slice(0, 15);
  }, [events, getAllTasks, getActiveTasks, tasks]);

  // Extract unique owner names from tasks (ignore undefined/null)
  const owners = useMemo<string[]>(() => {
    const names = upcomingTasks.map((t: any) => t.owner).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort();
  }, [upcomingTasks]);

  // Apply category and ownership filters
  const filteredByOwnership = useMemo(() => {
    if (momentFilter === "mine") {
      return sorted.filter((e) => (e as any).user_id === user?.id);
    } else if (momentFilter === "shared") {
      const userEmail = user?.email?.toLowerCase().trim();
      return sorted.filter((e) => {
        const sharedWith = (e as any).shared_with || [];
        const isSharedWithUser = sharedWith.some((email: string) => 
          email.toLowerCase().trim() === userEmail
        );
        return isSharedWithUser && (e as any).user_id !== user?.id;
      });
    }
    return sorted; // "all"
  }, [sorted, momentFilter, user?.id, user?.email]);
  
  // Apply category filter
  const visibleEvents = filter === 'all'
    ? filteredByOwnership
    : filteredByOwnership.filter(e => e.category === filter);
  
  // Unread notifications now handled in App-level UI

  const filteredTasks = upcomingTasks.filter((t: any) => {
    const matchesCategory = filter === 'all' || t.eventCategory === filter;
    const matchesOwner =
      ownerFilter === 'all'
        ? true
        : ownerFilter === 'none'
        ? !t.owner
        : t.owner === ownerFilter;
    return matchesCategory && matchesOwner;
  });

  // Sort tasks based on sortOrder
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (!a.completionDate) return 1;
    if (!b.completionDate) return -1;
    const diff =
      new Date(a.completionDate).getTime() -
      new Date(b.completionDate).getTime();
    return sortOrder === 'asc' ? diff : -diff;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Loading moments...</p>
          <div className="mt-4 animate-pulse">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-32 sm:w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcoming Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center mt-2"
      >
        <h1 className="font-semibold text-3xl text-gray-800 dark:text-gray-100">✨ My Moments</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Treasure your memories. Plan your next adventures.
        </p>
      </motion.div>
      {/* Header Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        {/* Dashboard Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setMomentFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${
              momentFilter === "all"
                ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMomentFilter("mine")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${
              momentFilter === "mine"
                ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            My Moments
          </button>
          <button
            onClick={() => setMomentFilter("shared")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${
              momentFilter === "shared"
                ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Shared with Me
          </button>
        </div>
        
        {/* Notifications moved to top bar */}
      </div>
      
      {/* Category Filter Bar */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat as any)}
            className={`py-2 px-3 text-sm md:text-base rounded-full font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${
              filter === cat
                ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-sm text-gray-700 dark:text-gray-300'
            }`}
          >
            {cat === 'all'
              ? 'All'
              : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Past Moments now live on /memories */}
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
        {momentFilter === "mine" ? "My Moments" : momentFilter === "shared" ? "Shared with Me" : "All Moments"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {visibleEvents.filter((m)=>!isPast(m)).map((e) => {
          const total = e.tasks.length;
          const completed = e.tasks.filter((t) => t.completed || t.done).length;
        const pct = Math.round((completed / total) * 100);
        const urgent = daysUntil(e.date) <= 7;
          const categoryInfo = getCategoryInfo(e.category);
          
        return (
            <div key={e.id} className="rounded-2xl shadow-lg hover:shadow-xl transition-all border border-transparent bg-gradient-to-r from-pink-200 to-indigo-200 p-[1px] relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`bg-white dark:bg-gray-800 rounded-2xl p-4 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ${
                  (e as any).status === "pending" ? "opacity-60" : "opacity-100"
                }`}
              >
                {isPast(e) && (
                  <span className="absolute top-2 right-3 text-xs px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                    ⏳ Past Due
                  </span>
                )}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    {categoryInfo.emoji} {e.name || e.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500">
                      {new Date(e.date).toLocaleDateString()}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                        e.category === "work"
                          ? "bg-blue-100 text-blue-800"
                          : e.category === "birthday"
                          ? "bg-pink-100 text-pink-800"
                          : e.category === "travel"
                          ? "bg-teal-100 text-teal-800"
                          : e.category === "education"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {e.category}
                    </span>
                  </div>
              </div>
                <div className={`text-sm font-medium ${urgent ? "text-red-600" : "text-gray-600"}`}>
                {getCountdown(e.date)}
              </div>
            </div>
            {e.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{e.description}</p>
            )}
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 flex items-center justify-between">
                <span>📋 {total} {total === 1 ? "preparation step" : "preparation steps"}</span>
                {total > 0 ? (
                  <span>
                    {total - completed} open • {completed} done{completed === total && <span className="ml-1">🎉</span>}
                  </span>
                ) : (
                  <span className="text-gray-400">no steps yet — start preparing 🌿</span>
                )}
              </p>
              {(e as any).status === "pending" ? (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={async () => {
                      if (!user?.email || !acceptMoment || processingMomentId === e.id) return;
                      try {
                        setProcessingMomentId(e.id);
                        console.log("[Home] Accepting moment", e.id, "for user", user.email);
                        await acceptMoment(e.id, user.email);
                        // Success - fetchMoments will be called by acceptMoment
                      } catch (error: any) {
                        console.error("[Home] Error accepting moment:", error);
                        alert(`Failed to accept invitation: ${error?.message || "Unknown error"}`);
                      } finally {
                        setProcessingMomentId(null);
                      }
                    }}
                    disabled={processingMomentId === e.id}
                    className="px-4 py-2 rounded-md bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-md focus:ring-2 focus:ring-green-400 focus:outline-none text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingMomentId === e.id ? "Processing..." : "Accept"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!user?.email || !declineMoment || processingMomentId === e.id) return;
                      try {
                        setProcessingMomentId(e.id);
                        console.log("[Home] Declining moment", e.id, "for user", user.email);
                        await declineMoment(e.id, user.email);
                        // Success - fetchMoments will be called by declineMoment
                      } catch (error: any) {
                        console.error("[Home] Error declining moment:", error);
                        alert(`Failed to decline invitation: ${error?.message || "Unknown error"}`);
                      } finally {
                        setProcessingMomentId(null);
                      }
                    }}
                    disabled={processingMomentId === e.id}
                    className="px-4 py-2 rounded-md bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-md focus:ring-2 focus:ring-gray-400 focus:outline-none text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingMomentId === e.id ? "Processing..." : "Decline"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex gap-2 justify-between">
                  <div className="flex gap-2">
                    <Link
                      to={`/event/${e.id}`}
                      className="inline-block px-3 py-1.5 rounded-md bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-md focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm font-medium"
                    >
                      🌿 Plan
                    </Link>
                    <Link
                      to={`/edit/${e.id}`}
                      className="inline-block bg-blue-200 dark:bg-blue-700 hover:bg-blue-300 dark:hover:bg-blue-600 rounded px-2 py-1 text-sm transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 dark:text-gray-200 font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMoment(e);
                      setShowShare(true);
                    }}
                    className="text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  >
                    🔗 Share
                  </button>
                </div>
              )}
              </motion.div>
            </div>
          );
        })}
        </AnimatePresence>
        
        {/* Empty state for filtered events */}
        {visibleEvents.length === 0 && sorted.length > 0 && (
          <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="mb-2">No {filter === 'all' ? '' : filter} events found.</p>
            <button
              onClick={() => setFilter('all')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-2 transition-all duration-200 hover:underline focus:ring-2 focus:ring-blue-400 focus:outline-none rounded px-2 py-1"
            >
              Show all events
            </button>
          </div>
        )}
        
        {/* Empty state for no events at all */}
        {sorted.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full text-center py-10"
          >
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              ✨ Start creating your first Moment!
            </p>
            <button
              onClick={() => navigate("/add")}
              className="px-6 py-3 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-lg focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium"
            >
              <span className="text-white">+</span> Add
            </button>
          </motion.div>
        )}
      </div>

      {/* Upcoming Tasks Section */}
      {sortedTasks.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mt-8 mb-1">
            Preparations
            <span className="block h-[2px] w-12 sm:w-16 bg-indigo-400 dark:bg-indigo-500 mt-2 rounded" />
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {filter !== 'all' && ` (${filter})`}
            {ownerFilter !== 'all' && ` • ${ownerFilter === 'none' ? 'No Owner' : ownerFilter}`}
          </p>
          
          {/* Owner Filter Bar */}
          {(owners.length > 0 || upcomingTasks.some((t: any) => !t.owner)) && (
            <div className="mt-6 mb-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {/* All Owners */}
                <button
                  onClick={() => setOwnerFilter('all')}
                    className={`py-2 px-3 text-sm md:text-base rounded-full font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                      ownerFilter === 'all'
                        ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-sm text-gray-700 dark:text-gray-300'
                    }`}
                >
                  All Owners
                </button>

                {/* No Owner */}
                <button
                  onClick={() => setOwnerFilter('none')}
                    className={`py-2 px-3 text-sm md:text-base rounded-full font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                      ownerFilter === 'none'
                        ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-sm text-gray-700 dark:text-gray-300'
                    }`}
                >
                  👤 No Owner
                </button>

                {/* Dynamic Owner Buttons */}
                {owners.map((name: string) => (
                  <button
                    key={String(name)}
                    onClick={() => setOwnerFilter(name)}
                    className={`py-2 px-3 text-sm md:text-base rounded-full font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                      ownerFilter === name
                        ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-sm text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    👤 {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-end mb-3">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] py-2 px-3 text-sm md:text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              Sort: {sortOrder === 'asc' ? 'Soonest → Latest' : 'Latest → Soonest'}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              <AnimatePresence>
                {sortedTasks.map((task) => {
                const daysLeft = task.completionDate ? Math.ceil((new Date(task.completionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                const countdownText = daysLeft < 0 ? "⚠️ Past due" : `⏳ ${daysLeft} days left`;
                
                // Get category color for event chip
                const categoryInfo = getCategoryInfo(task.eventCategory);
                
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white/70 dark:bg-gray-700/70 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer active:scale-95"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-semibold ${
                            task.eventCategory === "work" ? "bg-blue-200 text-blue-800" :
                            task.eventCategory === "birthday" ? "bg-pink-200 text-pink-800" :
                            task.eventCategory === "travel" ? "bg-teal-200 text-teal-800" :
                            task.eventCategory === "education" ? "bg-indigo-200 text-indigo-800" :
                            "bg-rose-200 text-rose-800"
                          }`}
                        >
                          {categoryInfo.emoji} {task.eventTitle}
                        </span>
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-gray-100">{task.text}</span>
                            {task.completionDate && (
                              <span
                                title={`Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}${!task.reminderEnabled ? " (reminder disabled)" : ""}`}
                                className={`text-sm ${
                                  !task.reminderEnabled 
                                    ? "text-gray-300 dark:text-gray-500 opacity-50"
                                    : daysLeft !== null && daysLeft <= 1
                                    ? "text-red-500 dark:text-red-400 animate-pulse"
                                    : "text-gray-400 dark:text-gray-500"
                                }`}
                              >
                                {daysLeft !== null && daysLeft <= 1 ? (
                                  <BellRing size={16} />
                                ) : (
                                  <Bell size={16} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
              <Link
                        to={`/event/${task.eventId}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-all duration-200 hover:underline focus:ring-2 focus:ring-blue-400 focus:outline-none rounded"
                      >
                        View →
                      </Link>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>
                        {task.owner ? `👤 ${task.owner}` : "👤 No owner"}
                        {" • "}
                        {task.completionDate
                          ? `⏳ ${getCountdown(task.completionDate)}`
                          : "📅 No target date"}
                      </div>
                      {task.completionDate && (
                        <div className={`font-medium ${getTaskCountdownColor(daysLeft)}`}>
                          {countdownText}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
      
      {/* Empty state for filtered tasks */}
      {sortedTasks.length === 0 && upcomingTasks.length > 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p className="text-gray-500 dark:text-gray-400 italic">
            ✨ No preparation steps match your filters — time to plan your next Moment!
          </p>
          <div className="mt-2 space-x-2">
            <button
              onClick={() => setFilter('all')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all duration-200 hover:underline focus:ring-2 focus:ring-blue-400 focus:outline-none rounded px-2 py-1"
            >
              Show all categories
            </button>
            <span className="text-gray-400 dark:text-gray-600">•</span>
            <button
              onClick={() => setOwnerFilter('all')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all duration-200 hover:underline focus:ring-2 focus:ring-blue-400 focus:outline-none rounded px-2 py-1"
            >
              Show all owners
            </button>
          </div>
        </div>
      )}

      {/* Empty state for no tasks at all */}
      {upcomingTasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Everything's ready — no pending preparations 🎉
          </p>
        </motion.div>
      )}
      
      {/* Share Modal */}
      {showShare && selectedMoment && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-sm shadow-lg border border-gray-200 dark:border-gray-700 mx-3">
            <h3 className="font-semibold mb-3 text-lg text-gray-800 dark:text-gray-100">Share this Moment</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {selectedMoment.title || selectedMoment.name}
            </p>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="Enter collaborator email"
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded w-full px-3 py-2 mb-3 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all"
            />
            <div className="flex justify-end gap-2">
              <button 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none rounded px-3 py-1" 
                onClick={() => {
                  setShowShare(false);
                  setShareEmail("");
                  setSelectedMoment(null);
                }}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 dark:bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none"
                onClick={async () => {
                  if (!shareEmail.trim()) return;
                  const existing = (selectedMoment as any).shared_with || [];
                  // Normalize emails: lowercase, trim, remove duplicates
                  const cleaned = [...(existing as any[]), shareEmail.trim()]
                    .map((e) => e.trim().toLowerCase())
                    .filter((e, i, arr) => e && arr.indexOf(e) === i);
                  try {
                    const result = await (shareMoment as any)(selectedMoment.id, cleaned);
                    if (result?.message) {
                      setToast({ message: result.message, type: result.success ? 'success' : 'error' });
                      setTimeout(() => setToast(null), 5000);
                    }
                    setShowShare(false);
                    setShareEmail("");
                    setSelectedMoment(null);
                  } catch (err) {
                    setToast({ message: `❌ Failed to share: ${err instanceof Error ? err.message : 'Unknown error'}`, type: 'error' });
                    setTimeout(() => setToast(null), 5000);
                  }
                }}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <p className="font-medium">{toast.message}</p>
        </div>
      )}
      
      {/* Floating Add Button */}
      <button
        onClick={() => navigate('/add')}
        className="fixed bottom-6 right-6 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-3xl transition-all duration-200 hover:scale-110 active:scale-95 z-50 focus:ring-2 focus:ring-blue-400 focus:outline-none"
        title="Add"
        aria-label="Add"
      >
        +
      </button>
    </div>
  );
}