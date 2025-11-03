import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuthStore, supabase } from "@moments/shared";
import { useEventStore } from "../store/useEventStore";
import { ThemeToggle } from "../components/ThemeToggle";
import { Bell } from "lucide-react";
export function App() {
    const { user, signOut } = useAuthStore();
    const resetStore = useEventStore((s) => s.reset);
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationsRef = useRef(null);
    const [loggingOut, setLoggingOut] = useState(false);
    const notifications = useEventStore((s) => s.notifications || []);
    const fetchNotifications = useEventStore((s) => s.fetchNotifications);
    // Track user changes and reset store when switching users
    useEffect(() => {
        const lastUser = localStorage.getItem("lastUserEmail");
        const currentUser = user?.email?.toLowerCase() || null;
        // When a new user logs in (and it's different from last user), reset local data
        // Only reset if lastUser exists - don't reset on first load with same user
        if (currentUser && lastUser && currentUser !== lastUser) {
            console.log("[Auth] User switch detected, resetting store");
            resetStore();
            localStorage.setItem("lastUserEmail", currentUser);
        }
        else if (currentUser && !lastUser) {
            // First time logging in - just set the user email, don't reset
            console.log("[Auth] First login for this session, setting user email");
            localStorage.setItem("lastUserEmail", currentUser);
        }
        // When user logs out, clear store and cache
        if (!currentUser && lastUser) {
            console.log("[Auth] User logged out, clearing store");
            resetStore();
            localStorage.removeItem("lastUserEmail");
            localStorage.removeItem("moments-store");
        }
    }, [user, resetStore]);
    // Restore session and handle redirects with specific auth events
    useEffect(() => {
        if (!supabase)
            return;
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "INITIAL_SESSION") {
                if (!session)
                    navigate("/login");
            }
            else if (event === "SIGNED_IN") {
                navigate("/");
            }
            else if (event === "SIGNED_OUT") {
                navigate("/login");
            }
        });
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [navigate]);
    // Close dropdowns when clicking outside (single listener)
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    // Fetch notifications and subscribe to realtime
    useEffect(() => {
        const normalizedEmail = user?.email?.toLowerCase().trim();
        if (!normalizedEmail)
            return;
        fetchNotifications?.(normalizedEmail);
        const poll = setInterval(() => fetchNotifications?.(normalizedEmail), 10000);
        let channel = null;
        if (supabase && supabase?.channel) {
            channel = supabase
                .channel(`notifications-${normalizedEmail.replace(/[^a-z0-9]/g, '-')}`)
                .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
                const n = payload?.new;
                if (n?.recipient?.toLowerCase?.().trim?.() === normalizedEmail) {
                    fetchNotifications?.(normalizedEmail);
                }
            })
                .subscribe();
        }
        return () => {
            clearInterval(poll);
            if (channel && supabase && supabase?.removeChannel) {
                supabase.removeChannel(channel);
            }
        };
    }, [user?.email, fetchNotifications]);
    const displayName = user?.user_metadata?.display_name?.trim() || user?.user_metadata?.name?.trim() || user?.email?.split("@")[0] || "User";
    const avatarUrl = user?.user_metadata?.avatar_url;
    return (_jsxs("div", { className: "min-h-screen overflow-x-hidden bg-gradient-to-br from-indigo-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900", children: [_jsx("header", { className: "sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 shadow-sm", children: _jsxs("div", { className: "max-w-4xl w-full mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative", ref: menuRef, children: [_jsx("button", { "aria-label": "Open menu", className: "p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700", onClick: () => setMenuOpen((v) => !v), children: "\u2630" }), menuOpen && (_jsxs("div", { className: "absolute left-0 mt-2 w-44 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-1 z-50", children: [_jsx(Link, { to: "/", onClick: () => setMenuOpen(false), className: "block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700", children: "Home" }), _jsx(Link, { to: "/memories", onClick: () => setMenuOpen(false), className: "block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700", children: "Memories" }), _jsx(Link, { to: "/profile", onClick: () => setMenuOpen(false), className: "block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700", children: "Profile" }), _jsx("div", { className: "px-3 py-1.5", children: _jsx(ThemeToggle, {}) }), user ? (_jsx("button", { className: "w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700", onClick: async () => {
                                                        await signOut();
                                                        setMenuOpen(false);
                                                        navigate("/login");
                                                    }, children: "Logout" })) : (_jsx(Link, { to: "/login", onClick: () => setMenuOpen(false), className: "block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700", children: "Sign In" }))] }))] }), _jsx(Link, { to: "/", className: "flex items-center gap-2 group", children: _jsx("h1", { className: "text-xl sm:text-2xl font-semibold text-blue-600 dark:text-blue-400 transition", children: "My Moments" }) })] }), _jsxs("div", { className: "flex items-center gap-2 sm:gap-3", children: [_jsx(Link, { to: "/add", className: "hidden sm:inline-flex px-3 py-1.5 rounded-md bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] hover:shadow focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm font-medium", children: "+ New" }), _jsxs("div", { className: "relative", ref: notificationsRef, children: [_jsxs("button", { "aria-label": "Notifications", className: "relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200", title: "Notifications", onClick: () => setShowNotifications((v) => !v), children: [_jsx(Bell, { className: "w-5 h-5" }), (notifications?.filter?.((n) => !n.read)?.length || 0) > 0 && (_jsx("span", { className: "absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center", children: Math.min(9, notifications.filter((n) => !n.read).length) }))] }), showNotifications && (_jsxs("div", { className: "absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-md shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50", children: [_jsxs("div", { className: "px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between", children: [_jsx("span", { className: "font-semibold text-sm", children: "Notifications" }), _jsx("span", { className: "text-xs text-gray-500", children: notifications.length || 0 })] }), _jsxs("div", { className: "py-1", children: [(!notifications || notifications.length === 0) && (_jsx("div", { className: "px-3 py-4 text-sm text-gray-500", children: "No notifications" })), notifications?.map?.((n) => (_jsxs("button", { onClick: async () => {
                                                                try {
                                                                    await supabase
                                                                        .from("notifications")
                                                                        .update({ read: true })
                                                                        .eq("id", n.id);
                                                                }
                                                                catch { }
                                                                setShowNotifications(false);
                                                                if (n.link) {
                                                                    navigate(n.link);
                                                                }
                                                            }, className: `w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${!n.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`, children: [_jsx("div", { className: "text-gray-800 dark:text-gray-100", children: n.message }), _jsx("div", { className: "text-xs text-gray-500 mt-1", children: new Date(n.created_at).toLocaleString() })] }, n.id)))] })] }))] }), user ? (_jsxs(_Fragment, { children: [_jsxs(Link, { to: "/profile", className: "flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition", children: [avatarUrl ? (_jsx("img", { src: avatarUrl, alt: "Avatar", className: "w-8 h-8 rounded-full border" })) : (_jsx("div", { className: "w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs", children: "\uD83D\uDC64" })), _jsx("span", { className: "hidden sm:inline", children: displayName })] }), _jsx("button", { onClick: async () => {
                                                if (loggingOut)
                                                    return;
                                                setLoggingOut(true);
                                                try {
                                                    await signOut();
                                                    // Hard-clear any persisted event data to avoid flicker
                                                    try {
                                                        resetStore();
                                                        if (typeof localStorage !== 'undefined') {
                                                            localStorage.removeItem('moments-store');
                                                        }
                                                    }
                                                    catch { }
                                                    setMenuOpen(false);
                                                    setShowNotifications(false);
                                                }
                                                finally {
                                                    setLoggingOut(false);
                                                }
                                            }, disabled: loggingOut, className: `hidden sm:inline-flex px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium transition-all duration-200 active:scale-95 ${loggingOut
                                                ? "opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500"
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`, title: "Log out", children: loggingOut ? "Logging out..." : "Logout" })] })) : (_jsx(Link, { to: "/login", className: "px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-300 active:scale-95", children: "Sign In" }))] })] }) }), _jsx("div", { className: "max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 dark:text-gray-100", children: _jsx(Outlet, {}) })] }));
}
