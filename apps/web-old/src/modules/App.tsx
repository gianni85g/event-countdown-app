import { Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuthStore, supabase } from "@moments/shared";
import { useEventStore } from "../store/useEventStore";
import { ThemeToggle } from "../components/ThemeToggle";
import { Bell } from "lucide-react";

export function App() {
  const { user, signOut } = useAuthStore();
  const resetStore = useEventStore((s: any) => s.reset);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // Restore session on mount and react to auth changes
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (!session) {
          navigate("/login");
        }
      } catch {
        // ignore
      }
    };

    initAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      } else {
        navigate("/login");
      }
    });

    return () => {
      isMounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, [navigate]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);
  
  const displayName = user?.user_metadata?.display_name?.trim() || user?.user_metadata?.name?.trim() || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 shadow-sm">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-3">
          {/* Left: Hamburger (mobile) + App name */}
          <div className="flex items-center gap-2">
            <div className="sm:hidden relative" ref={menuRef}>
              <button
                aria-label="Open menu"
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setMenuOpen((v) => !v)}
              >
                ☰
              </button>
              {menuOpen && (
                <div className="absolute left-0 mt-2 w-44 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <Link to="/" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Home</Link>
                  <Link to="/memories" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Memories</Link>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Profile</Link>
                  <div className="px-3 py-1.5">
                    <ThemeToggle />
                  </div>
                  {user ? (
                    <button
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={async () => {
                        await signOut();
                        setMenuOpen(false);
                        navigate("/login");
                      }}
                    >
                      Logout
                    </button>
                  ) : (
                    <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Sign In</Link>
                  )}
                </div>
              )}
            </div>
            <Link to="/" className="flex items-center gap-2 group">
              <h1 className="text-xl sm:text-2xl font-semibold text-blue-600 dark:text-blue-400 transition">
                My Moments
              </h1>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop menu quick add */}
            <Link
              to="/add"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-md bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] hover:shadow focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm font-medium"
            >
              + New
            </Link>
            {/* Notification bell placeholder (moved near profile) */}
            <button
              aria-label="Notifications"
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>
            {/* Profile */}
            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs">👤</div>
                )}
                <span className="hidden sm:inline">{displayName}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-300 active:scale-95"
              >
                Sign In
              </Link>
            )}
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
