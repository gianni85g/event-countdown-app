import { Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@moments/shared";
import { useEventStore } from "../store/useEventStore";
import { ThemeToggle } from "../components/ThemeToggle";

export function App() {
  const { user, signOut } = useAuthStore();
  const resetStore = useEventStore((s: any) => s.reset);
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
    } else if (currentUser && !lastUser) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 shadow-sm">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <Link 
            to="/" 
            className="flex items-center gap-2 group"
          >
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition">
              My Moments
            </h1>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/memories"
              className="text-gray-700 dark:text-gray-200 hover:text-indigo-500 transition-colors px-2 py-1 rounded"
            >
              🕰 Memories
            </Link>
            <ThemeToggle />
            {user && (
              <Link
                to="/profile"
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                    👤
                  </div>
                )}
                <span>{displayName}</span>
              </Link>
            )}
            {user ? (
              <button
                onClick={async () => {
                  await signOut();
                  navigate("/login");
                }}
                className="px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-300 active:scale-95 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-300 active:scale-95"
              >
                Sign In
              </Link>
            )}
            <Link
              to="/add"
              className="px-4 py-2 rounded-md bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] hover:shadow-md focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium"
            >
              <span className="text-white">+</span> Add
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="max-w-4xl w-full mx-auto px-4 py-6 dark:text-gray-100">
        <Outlet />
      </div>
    </div>
  );
}
