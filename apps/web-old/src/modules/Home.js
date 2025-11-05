import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "@moments/shared";
import { getCountdown, daysUntil, useAuthStore } from "@moments/shared";
import { useEventStore } from "../store/useEventStore";
import { motion, AnimatePresence } from "framer-motion";
// Removed task-row bell icons to avoid duplicate notification visuals
const CATEGORIES = [
    { id: "birthday", label: "Birthday", emoji: "🎂", color: "bg-pink-200", gradient: "from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30" },
    { id: "work", label: "Work / Meeting", emoji: "💼", color: "bg-blue-200", gradient: "from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30" },
    { id: "travel", label: "Travel", emoji: "🌍", color: "bg-teal-200", gradient: "from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30" },
    { id: "education", label: "Education", emoji: "🎓", color: "bg-indigo-200", gradient: "from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30" },
    { id: "personal", label: "Personal", emoji: "❤️", color: "bg-rose-200", gradient: "from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30" }
];
function getCategoryInfo(category) {
    return CATEGORIES.find(cat => cat.id === category) || CATEGORIES[4];
}
function getTaskCountdownColor(daysLeft) {
    if (daysLeft < 3)
        return "text-red-600";
    if (daysLeft <= 10)
        return "text-yellow-500";
    return "text-green-600";
}
export function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    // ✅ Subscribe to Zustand store keys (triggers re-render when tasks update)
    const events = useEventStore((s) => s.events);
    const moments = useEventStore((s) => s.moments || []);
    const tasks = useEventStore((s) => s.tasks || []);
    const getAllTasks = useEventStore((s) => s.getAllTasks);
    const subscribeRealtime = useEventStore((s) => s.subscribeRealtime);
    const getActiveTasks = useEventStore((s) => s.getActiveTasks);
    const checkUpcomingEvents = useEventStore((s) => s.checkUpcomingEvents);
    const checkUpcomingTasks = useEventStore((s) => s.checkUpcomingTasks);
    const fetchMoments = useEventStore((s) => s.fetchMoments);
    const fetchTasks = useEventStore((s) => s.fetchTasks);
    const shareMoment = useEventStore((s) => s.shareMoment);
    const acceptMoment = useEventStore((s) => s.acceptMoment);
    const declineMoment = useEventStore((s) => s.declineMoment);
    const removeEvent = useEventStore((s) => s.removeEvent);
    const [loading, setLoading] = useState(true);
    const [showShare, setShowShare] = useState(false);
    const [selectedMoment, setSelectedMoment] = useState(null);
    const [shareEmail, setShareEmail] = useState("");
    const [processingMomentId, setProcessingMomentId] = useState(null);
    const [toast, setToast] = useState(null);
    const [warningMessage, setWarningMessage] = useState(null);
    const preparationsRef = useRef(null);
    // Safe delete handler (prevents crash, updates local state immediately)
    const handleDelete = async (moment) => {
        try {
            // Block deletion for moments shared with the current user
            const currentUser = useAuthStore.getState().user;
            const userEmail = currentUser?.email?.toLowerCase().trim();
            const isOwner = moment?.user_id === currentUser?.id;
            // Only the owner can delete; block for non-owners
            if (!isOwner) {
                setWarningMessage("This moment cannot be canceled because it was shared with you.");
                return;
            }
            const id = moment?.id;
            if (typeof removeEvent === 'function') {
                await removeEvent(id);
            }
            else if (supabase?.from) {
                await supabase.from('moments').delete().eq('id', id);
                // Optimistic local removal if needed
                try {
                    const { events: current } = useEventStore.getState();
                    useEventStore.setState({ events: current.filter((m) => m.id !== id) });
                }
                catch { }
            }
            // Ensure fresh data after deletion
            try {
                const userId = useAuthStore.getState().user?.id;
                if (userId && typeof fetchMoments === 'function') {
                    await fetchMoments(userId);
                }
            }
            catch { }
        }
        catch (err) {
            console.error('Failed to delete moment:', err);
        }
    };
    // Dashboard filter state (All / My Moments / Shared with Me)
    const [momentFilter, setMomentFilter] = useState("all");
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
    const [filter, setFilter] = useState('all');
    // Owner filter state
    const [ownerFilter, setOwnerFilter] = useState('all');
    // Sorting state
    const [sortOrder, setSortOrder] = useState('asc');
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
    const sorted = useMemo(() => [...events].sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return bTime - aTime; // newest (latest date) first
    }), [events]);
    // Realtime moments updates
    useEffect(() => {
        if (!subscribeRealtime)
            return;
        const channel = subscribeRealtime();
        return () => {
            try {
                if (channel && supabase?.removeChannel) {
                    supabase.removeChannel(channel);
                }
            }
            catch { }
        };
    }, [subscribeRealtime]);
    // (scroll effect added later, after upcomingTasks is defined)
    const isPast = (m) => !!m.isPast || new Date(m.date) < new Date();
    const upcomingTasks = useMemo(() => {
        // Prefer store-provided active tasks (filters out past moments)
        const base = typeof getActiveTasks === 'function' ? getActiveTasks() : getAllTasks();
        const today = new Date();
        const active = base.filter((t) => {
            const event = events.find((e) => e.id === t.eventId);
            const isPastMoment = event ? (event.isPast || new Date(event.date) < today) : false;
            return !isPastMoment && !(t.done || t.completed);
        });
        console.log("[Home] Computing upcomingTasks (active moments only), total:", active.length);
        return active
            .sort((a, b) => {
            if (!a.completionDate)
                return 1;
            if (!b.completionDate)
                return -1;
            return new Date(a.completionDate).getTime() - new Date(b.completionDate).getTime();
        })
            .slice(0, 15);
    }, [events, getAllTasks, getActiveTasks, tasks]);
    // If visiting /preparations route, scroll to the preparations section when tasks are ready
    useEffect(() => {
        if (location.pathname.endsWith('/preparations')) {
            requestAnimationFrame(() => {
                preparationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    }, [location.pathname, upcomingTasks.length]);
    // Extract unique owner names from tasks (ignore undefined/null)
    const owners = useMemo(() => {
        const names = upcomingTasks.map((t) => t.owner).filter(Boolean);
        return Array.from(new Set(names)).sort();
    }, [upcomingTasks]);
    // Apply category and ownership filters
    const filteredByOwnership = useMemo(() => {
        if (momentFilter === "mine") {
            return sorted.filter((e) => e.user_id === user?.id);
        }
        else if (momentFilter === "shared") {
            const userEmail = user?.email?.toLowerCase().trim();
            return sorted.filter((e) => {
                const sharedWith = e.shared_with || [];
                const isSharedWithUser = sharedWith.some((email) => email.toLowerCase().trim() === userEmail);
                return isSharedWithUser && e.user_id !== user?.id;
            });
        }
        return sorted; // "all"
    }, [sorted, momentFilter, user?.id, user?.email]);
    // Apply category filter
    const visibleEvents = filter === 'all'
        ? filteredByOwnership
        : filteredByOwnership.filter(e => e.category === filter);
    // Ensure unified sorting by event date asc (soonest first) for owned + shared
    const getEventTime = (m) => new Date(m.date || m.event_date || m.created_at).getTime();
    const upcomingEventsSorted = useMemo(() => {
        return visibleEvents
            .filter((m) => !isPast(m))
            .slice()
            .sort((a, b) => getEventTime(a) - getEventTime(b));
    }, [visibleEvents]);
    // Unread notifications now handled in App-level UI
    const filteredTasks = upcomingTasks.filter((t) => {
        const matchesCategory = filter === 'all' || t.eventCategory === filter;
        const matchesOwner = ownerFilter === 'all'
            ? true
            : ownerFilter === 'none'
                ? !t.owner
                : t.owner === ownerFilter;
        return matchesCategory && matchesOwner;
    });
    // Sort tasks based on sortOrder
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (!a.completionDate)
            return 1;
        if (!b.completionDate)
            return -1;
        const diff = new Date(a.completionDate).getTime() -
            new Date(b.completionDate).getTime();
        return sortOrder === 'asc' ? diff : -diff;
    });
    const toggleTask = useEventStore((s) => s.toggleTask);
    if (loading) {
        return (_jsxs("div", { className: "max-w-4xl w-full mx-auto px-4 sm:px-6 py-6", children: [_jsx("div", { className: "text-center mb-6", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400 text-lg", children: "Loading moments..." }) }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-pulse", children: Array.from({ length: 6 }).map((_, i) => (_jsx("div", { className: "rounded-2xl p-[1px] bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 h-60 sm:h-64 flex flex-col", children: [_jsx("div", { className: "h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" }), _jsx("div", { className: "h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-2" }), _jsxs("div", { className: "flex gap-2 mb-4", children: [_jsx("div", { className: "h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" }), _jsx("div", { className: "h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" })] }), _jsxs("div", { className: "mt-auto flex items-center justify-between", children: [_jsx("div", { className: "h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" }), _jsx("div", { className: "h-8 w-14 bg-gray-200 dark:bg-gray-700 rounded" })] })] }) }, i))) }), _jsxs("div", { className: "mt-10", children: [_jsx("div", { className: "h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" }), _jsx("div", { className: "space-y-3 animate-pulse", children: Array.from({ length: 3 }).map((_, i) => (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700", children: [_jsx("div", { className: "h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" }), _jsx("div", { className: "h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" })] }, i))) })] })] }));
    }
    return (_jsxs("div", { className: "space-y-4 sm:space-y-6", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 }, className: "text-center mt-2", children: [_jsx("h1", { className: "font-semibold text-3xl text-gray-800 dark:text-gray-100", children: "\u2728 My Moments" }), _jsx("p", { className: "mt-1 text-gray-600 dark:text-gray-300", children: "Treasure your memories. Plan your next adventures." })] }), _jsx("div", { className: "flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 w-full", children: _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsx("button", { onClick: () => setMomentFilter("all"), className: `px-4 py-2 min-h-[44px] rounded-md text-sm font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${momentFilter === "all"
                                ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"}`, children: "All" }), _jsx("button", { onClick: () => setMomentFilter("mine"), className: `px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${momentFilter === "mine"
                                ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"}`, children: "My Moments" }), _jsx("button", { onClick: () => setMomentFilter("shared"), className: `px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${momentFilter === "shared"
                                ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"}`, children: "Shared with Me" })] }) }), _jsx("div", { className: "flex flex-wrap gap-2 justify-center mb-4", children: categories.map(cat => (_jsx("button", { onClick: () => setFilter(cat), className: `py-2 px-3 min-h-[40px] text-sm md:text-base rounded-full font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${filter === cat
                        ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-sm text-gray-700 dark:text-gray-300'}`, children: cat === 'all'
                        ? 'All'
                        : cat.charAt(0).toUpperCase() + cat.slice(1) }, cat))) }), _jsx("h2", { className: "text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3", children: momentFilter === "mine" ? "My Moments" : momentFilter === "shared" ? "Shared with Me" : "All Moments" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6", children: [_jsx(AnimatePresence, { children: upcomingEventsSorted.map((e) => {
                            const total = e.tasks.length;
                            const completed = e.tasks.filter((t) => t.completed || t.done).length;
                            const pct = Math.round((completed / total) * 100);
                            const urgent = daysUntil(e.date) <= 7;
                            const categoryInfo = getCategoryInfo(e.category);
                            return (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, transition: { duration: 0.3 }, className: `rounded-2xl shadow-lg hover:shadow-lg transition-shadow duration-200 border border-transparent p-[1px] relative ${e.sharedWithMe ? 'bg-gradient-to-r from-indigo-200 to-blue-200' : 'bg-gradient-to-r from-pink-200 to-indigo-200'}`, children: _jsxs("div", { className: `bg-white dark:bg-gray-800 rounded-2xl px-4 pt-8 pb-4 sm:px-5 sm:pt-10 sm:pb-5 h-60 sm:h-64 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ${e.status === "pending" || e.sharedWithMe ? "opacity-90" : "opacity-100"}`, children: [e.sharedWithMe && (_jsx("span", { className: "absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-1 text-xs bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-200 rounded-full z-10", children: "Shared with you" })), isPast(e) && (_jsx("span", { className: "absolute top-12 right-3 text-xs px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full", children: "\u23F3 Past Due" })), _jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1 truncate", children: [categoryInfo.emoji, " ", e.name || e.title] }), _jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-sm text-gray-500", children: new Date(e.date).toLocaleDateString() }), _jsx("span", { className: `text-xs font-medium px-2 py-1 rounded-full capitalize ${e.category === "work"
                                                                        ? "bg-blue-100 text-blue-800"
                                                                        : e.category === "birthday"
                                                                            ? "bg-pink-100 text-pink-800"
                                                                            : e.category === "travel"
                                                                                ? "bg-teal-100 text-teal-800"
                                                                                : e.category === "education"
                                                                                    ? "bg-indigo-100 text-indigo-800"
                                                                                    : "bg-rose-100 text-rose-800"}`, children: e.category })] })] }), _jsx("div", { className: `absolute bottom-4 left-5 text-sm font-medium ${urgent ? "text-red-600" : "text-gray-600"}`, children: getCountdown(e.date) })] }), e.description && (_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-300 mt-1", children: e.description })), _jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-300 mt-2 flex items-start justify-between", children: [_jsxs("span", { children: ["\uD83D\uDCCB ", total, " steps"] }), total > 0 ? (_jsxs("span", { className: "flex flex-col items-end leading-tight", children: [_jsxs("span", { className: "text-xs sm:text-sm", children: [total - completed, " open"] }), _jsxs("span", { className: "text-xs sm:text-sm", children: [completed, " completed", completed === total && _jsx("span", { className: "ml-1", children: "\uD83C\uDF89" })] })] })) : (_jsx("span", { className: "text-gray-400", children: "no steps yet \u2014 start preparing \uD83C\uDF3F" }))] }), e.status === "pending" ? (_jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx("button", { onClick: async () => {
                                                        if (!user?.email || !acceptMoment || processingMomentId === e.id)
                                                            return;
                                                        try {
                                                            setProcessingMomentId(e.id);
                                                            console.log("[Home] Accepting moment", e.id, "for user", user.email);
                                                            await acceptMoment(e.id, user.email);
                                                            // Success - fetchMoments will be called by acceptMoment
                                                        }
                                                        catch (error) {
                                                            console.error("[Home] Error accepting moment:", error);
                                                            alert(`Failed to accept invitation: ${error?.message || "Unknown error"}`);
                                                        }
                                                        finally {
                                                            setProcessingMomentId(null);
                                                        }
                                                    }, disabled: processingMomentId === e.id, className: "px-4 py-2 rounded-lg bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-md focus:ring-2 focus:ring-green-400 focus:outline-none text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed", children: processingMomentId === e.id ? "Processing..." : "Accept" }), _jsx("button", { onClick: async () => {
                                                        if (!user?.email || !declineMoment || processingMomentId === e.id)
                                                            return;
                                                        try {
                                                            setProcessingMomentId(e.id);
                                                            console.log("[Home] Declining moment", e.id, "for user", user.email);
                                                            await declineMoment(e.id, user.email);
                                                            // Success - fetchMoments will be called by declineMoment
                                                        }
                                                        catch (error) {
                                                            console.error("[Home] Error declining moment:", error);
                                                            alert(`Failed to decline invitation: ${error?.message || "Unknown error"}`);
                                                        }
                                                        finally {
                                                            setProcessingMomentId(null);
                                                        }
                                                    }, disabled: processingMomentId === e.id, className: "px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-md focus:ring-2 focus:ring-gray-400 focus:outline-none text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed", children: processingMomentId === e.id ? "Processing..." : "Decline" })] })) : (_jsxs("div", { className: "mt-4 flex gap-2 justify-between", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx(Link, { to: `/event/${e.id}`, className: "inline-block px-3 py-1.5 rounded-lg bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-md focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm font-medium", children: "\uD83C\uDF3F Plan" }), _jsx(Link, { to: `/edit/${e.id}`, className: "inline-block bg-blue-200 dark:bg-blue-700 hover:bg-blue-300 dark:hover:bg-blue-600 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 dark:text-gray-200 font-medium", children: "Edit" })] }), _jsx("button", { onClick: () => {
                                                        setSelectedMoment(e);
                                                        setShowShare(true);
                                                    }, className: "text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 focus:ring-2 focus:ring-blue-400 focus:outline-none", children: "\uD83D\uDD17 Share" })] }))] }) }, e.id));
                        }) }), visibleEvents.length === 0 && sorted.length > 0 && (_jsxs("div", { className: "col-span-full text-center text-gray-500 dark:text-gray-400 py-8", children: [_jsxs("p", { className: "mb-2", children: ["No ", filter === 'all' ? '' : filter, " events found."] }), _jsx("button", { onClick: () => setFilter('all'), className: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-2 transition-all duration-200 hover:underline focus:ring-2 focus:ring-blue-400 focus:outline-none rounded px-2 py-1", children: "Show all events" })] })), sorted.length === 0 && !loading && (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "col-span-full text-center py-10", children: [_jsx("p", { className: "text-lg text-gray-600 dark:text-gray-400 mb-4", children: "\u2728 Start creating your first Moment!" }), _jsxs("button", { onClick: () => navigate("/add"), className: "px-6 py-3 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-lg focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium", children: [_jsx("span", { className: "text-white", children: "+" }), " Add"] })] }))] }), _jsx("div", { ref: preparationsRef }), sortedTasks.length > 0 && (_jsxs("div", { children: [_jsxs("h2", { className: "text-2xl font-semibold text-gray-800 dark:text-gray-100 mt-8 mb-1", children: ["Preparations", _jsx("span", { className: "block h-[2px] w-12 sm:w-16 bg-indigo-400 dark:bg-indigo-500 mt-2 rounded" })] }), _jsxs("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-3", children: [filter !== 'all' && ` (${filter})`, ownerFilter !== 'all' && ` • ${ownerFilter === 'none' ? 'No Owner' : ownerFilter}`] }), (owners.length > 0 || upcomingTasks.some((t) => !t.owner)) && (_jsx("div", { className: "mt-6 mb-4", children: _jsxs("div", { className: "flex flex-wrap gap-2 justify-center", children: [_jsx("button", { onClick: () => setOwnerFilter('all'), className: `py-2 px-3 text-sm md:text-base rounded-full font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${ownerFilter === 'all'
                                        ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-sm text-gray-700 dark:text-gray-300'}`, children: "All Owners" }), _jsx("button", { onClick: () => setOwnerFilter('none'), className: `py-2 px-3 text-sm md:text-base rounded-full font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${ownerFilter === 'none'
                                        ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-sm text-gray-700 dark:text-gray-300'}`, children: "\uD83D\uDC64 No Owner" }), owners.map((name) => (_jsxs("button", { onClick: () => setOwnerFilter(name), className: `py-2 px-3 text-sm md:text-base rounded-full font-medium transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none ${ownerFilter === name
                                        ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-sm text-gray-700 dark:text-gray-300'}`, children: ["\uD83D\uDC64 ", name] }, String(name))))] }) })), _jsx("div", { className: "flex items-center justify-end mb-3", children: _jsxs("button", { onClick: () => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'), className: "text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] py-2 px-3 text-sm md:text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none", children: ["Sort: ", sortOrder === 'asc' ? 'Soonest → Latest' : 'Latest → Soonest'] }) }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700", children: _jsx("div", { className: "space-y-3", children: _jsx(AnimatePresence, { children: sortedTasks.map((task) => {
                                    const daysLeft = task.completionDate ? Math.ceil((new Date(task.completionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                                    const countdownText = daysLeft < 0 ? "⚠️ Past due" : `⏳ ${daysLeft} days left`;
                                    // Get category color for event chip
                                    const categoryInfo = getCategoryInfo(task.eventCategory);
                                    return (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.25 }, className: "bg-white/70 dark:bg-gray-700/70 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer active:scale-95", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("span", { className: `px-2 py-1 text-xs rounded-full font-semibold ${task.eventCategory === "work" ? "bg-blue-200 text-blue-800" :
                                                                    task.eventCategory === "birthday" ? "bg-pink-200 text-pink-800" :
                                                                        task.eventCategory === "travel" ? "bg-teal-200 text-teal-800" :
                                                                            task.eventCategory === "education" ? "bg-indigo-200 text-indigo-800" :
                                                                                "bg-rose-200 text-rose-800"}`, children: [categoryInfo.emoji, " ", task.eventTitle] }), _jsx("div", { className: "mt-2", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", className: "accent-indigo-600", checked: Boolean(task.done || task.completed), onChange: (e) => {
                                                                                e.stopPropagation();
                                                                                toggleTask(task.id, task.eventId);
                                                                            } }), _jsx("span", { className: `font-medium ${task.completed || task.done ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-100'}`, children: task.text })] }) })] }), _jsx(Link, { to: `/event/${task.eventId}`, className: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-all duration-200 hover:underline focus:ring-2 focus:ring-blue-400 focus:outline-none rounded", children: "View \u2192" })] }), _jsxs("div", { className: "text-sm text-gray-600 dark:text-gray-400 space-y-1", children: [_jsxs("div", { children: [task.owner ? `👤 ${task.owner}` : "👤 No owner", " • ", task.completionDate
                                                                ? `⏳ ${getCountdown(task.completionDate)}`
                                                                : "📅 No target date"] }), task.completionDate && (_jsx("div", { className: `font-medium ${getTaskCountdownColor(daysLeft)}`, children: countdownText }))] })] }, task.id));
                                }) }) }) })] })), sortedTasks.length === 0 && upcomingTasks.length > 0 && (_jsxs("div", { className: "text-center text-gray-500 dark:text-gray-400 py-8", children: [_jsx("p", { className: "text-gray-500 dark:text-gray-400 italic", children: "\u2728 No preparation steps match your filters \u2014 time to plan your next Moment!" }), _jsxs("div", { className: "mt-2 space-x-2", children: [_jsx("button", { onClick: () => setFilter('all'), className: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all duration-200 hover:underline focus:ring-2 focus:ring-blue-400 focus:outline-none rounded px-2 py-1", children: "Show all categories" }), _jsx("span", { className: "text-gray-400 dark:text-gray-600", children: "\u2022" }), _jsx("button", { onClick: () => setOwnerFilter('all'), className: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all duration-200 hover:underline focus:ring-2 focus:ring-blue-400 focus:outline-none rounded px-2 py-1", children: "Show all owners" })] })] })), upcomingTasks.length === 0 && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "text-center py-8", children: _jsx("p", { className: "text-gray-600 dark:text-gray-400 text-lg", children: "Everything's ready \u2014 no pending preparations \uD83C\uDF89" }) })), showShare && selectedMoment && (_jsx("div", { className: "fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700", children: [_jsx("h3", { className: "font-semibold mb-3 text-lg text-gray-800 dark:text-gray-100", children: "Share this Moment" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-300 mb-3", children: selectedMoment.title || selectedMoment.name }), _jsx("input", { type: "email", value: shareEmail, onChange: (e) => setShareEmail(e.target.value), placeholder: "Enter collaborator email", className: "border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded w-full px-3 py-2 mb-3 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { className: "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none rounded px-3 py-1", onClick: () => {
                                        setShowShare(false);
                                        setShareEmail("");
                                        setSelectedMoment(null);
                                    }, children: "Cancel" }), _jsx("button", { className: "bg-blue-600 dark:bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:ring-2 focus:ring-blue-400 focus:outline-none", onClick: async () => {
                                        if (!shareEmail.trim())
                                            return;
                                        const existing = selectedMoment.shared_with || [];
                                        // Normalize emails: lowercase, trim, remove duplicates
                                        const cleaned = [...existing, shareEmail.trim()]
                                            .map((e) => e.trim().toLowerCase())
                                            .filter((e, i, arr) => e && arr.indexOf(e) === i);
                                        try {
                                            const result = await shareMoment(selectedMoment.id, cleaned);
                                            if (result?.message) {
                                                setToast({ message: result.message, type: result.success ? 'success' : 'error' });
                                                setTimeout(() => setToast(null), 5000);
                                            }
                                            setShowShare(false);
                                            setShareEmail("");
                                            setSelectedMoment(null);
                                        }
                                        catch (err) {
                                            setToast({ message: `❌ Failed to share: ${err instanceof Error ? err.message : 'Unknown error'}`, type: 'error' });
                                            setTimeout(() => setToast(null), 5000);
                                        }
                                    }, children: "Share" })] })] }) })), toast && (_jsx("div", { className: `fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'}`, children: _jsx("p", { className: "font-medium", children: toast.message }) })), warningMessage && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center bg-black/40 z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700", children: [_jsx("p", { className: "text-gray-800 dark:text-gray-100 mb-4", children: warningMessage }), _jsx("div", { className: "text-right", children: _jsx("button", { onClick: () => setWarningMessage(null), className: "px-4 py-2 rounded bg-indigo-500 hover:bg-indigo-600 text-white transition-colors", children: "OK" }) })] }) })), _jsx("button", { onClick: () => navigate('/add'), className: "fixed bottom-6 right-6 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-3xl transition-all duration-200 hover:scale-110 active:scale-95 z-50 focus:ring-2 focus:ring-blue-400 focus:outline-none", title: "Add", "aria-label": "Add", children: "+" })] }));
}
