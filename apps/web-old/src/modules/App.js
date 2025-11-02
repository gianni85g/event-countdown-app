import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@moments/shared";
import { useEventStore } from "../store/useEventStore";
import { ThemeToggle } from "../components/ThemeToggle";
export function App() {
    const { user, signOut } = useAuthStore();
    const resetStore = useEventStore((s) => s.reset);
    const navigate = useNavigate();
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
    const displayName = user?.user_metadata?.display_name?.trim() || user?.user_metadata?.name?.trim() || user?.email?.split("@")[0] || "User";
    const avatarUrl = user?.user_metadata?.avatar_url;
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-indigo-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900", children: [_jsx("header", { className: "sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 shadow-sm", children: _jsxs("div", { className: "max-w-4xl mx-auto flex items-center justify-between", children: [_jsx(Link, { to: "/", className: "flex items-center gap-2 group", children: _jsx("h1", { className: "text-2xl font-bold text-blue-600 dark:text-blue-400 transition", children: "My Moments" }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link, { to: "/memories", className: "text-gray-700 dark:text-gray-200 hover:text-indigo-500 transition-colors px-2 py-1 rounded", children: "\uD83D\uDD70 Memories" }), _jsx(ThemeToggle, {}), user && (_jsxs(Link, { to: "/profile", className: "flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition", children: [avatarUrl ? (_jsx("img", { src: avatarUrl, alt: "Avatar", className: "w-8 h-8 rounded-full border" })) : (_jsx("div", { className: "w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs", children: "\uD83D\uDC64" })), _jsx("span", { children: displayName })] })), user ? (_jsx("button", { onClick: async () => {
                                        await signOut();
                                        navigate("/login");
                                    }, className: "px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-300 active:scale-95 focus:ring-2 focus:ring-blue-400 focus:outline-none", children: "Logout" })) : (_jsx(Link, { to: "/login", className: "px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-300 active:scale-95", children: "Sign In" })), _jsxs(Link, { to: "/add", className: "px-4 py-2 rounded-md bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-md focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium", children: [_jsx("span", { className: "text-white", children: "+" }), " Add"] })] })] }) }), _jsx("div", { className: "max-w-4xl mx-auto px-4 py-6 dark:text-gray-100", children: _jsx(Outlet, {}) })] }));
}
