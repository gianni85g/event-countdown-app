import { Outlet, Link, useNavigate, NavLink } from "react-router-dom";
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
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const notifications = useEventStore((s: any) => (s as any).notifications || []);
  const fetchNotifications = useEventStore((s: any) => (s as any).fetchNotifications);
  const unreadCount = (notifications?.filter?.((n: any) => !n.read)?.length || 0);

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

  // Restore session and handle redirects with specific auth events
  useEffect(() => {
    if (!supabase) return;
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        if (!session) navigate("/login");
      } else if (event === "SIGNED_IN") {
        navigate("/");
      } else if (event === "SIGNED_OUT") {
        navigate("/login");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);
  
  // Close dropdowns when clicking outside (single listener)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications and subscribe to realtime
  useEffect(() => {
    const normalizedEmail = user?.email?.toLowerCase().trim();
    if (!normalizedEmail) return;

    fetchNotifications?.(normalizedEmail);

    const poll = setInterval(() => fetchNotifications?.(normalizedEmail), 10000);

    let channel: any = null;
    if (supabase && (supabase as any)?.channel) {
      channel = (supabase as any)
        .channel(`notifications-${normalizedEmail.replace(/[^a-z0-9]/g, '-')}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          (payload: any) => {
            const n = payload?.new;
            if (n?.recipient?.toLowerCase?.().trim?.() === normalizedEmail) {
              fetchNotifications?.(normalizedEmail);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications" },
          () => fetchNotifications?.(normalizedEmail)
        )
        .subscribe();
    }

    return () => {
      clearInterval(poll);
      if (channel && supabase && (supabase as any)?.removeChannel) {
        (supabase as any).removeChannel(channel);
      }
    };
  }, [user?.email, fetchNotifications]);
  
  const displayName = user?.user_metadata?.display_name?.trim() || user?.user_metadata?.name?.trim() || user?.email?.split("@")[0] || "User";
  const initials = (user?.email?.[0] || "U").toUpperCase();

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-indigo-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 shadow-sm">
        <div className="max-w-4xl w-full mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3">
          {/* Left: Hamburger (mobile) + App name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative" ref={menuRef}>
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
                  <Link to="/preparations" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Preparations</Link>
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
            <Link to="/" className="flex items-center gap-2 group min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-blue-600 dark:text-blue-400 transition truncate max-w-[55vw] sm:max-w-none">
                My Moments
              </h1>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 flex-nowrap">
            <nav className="hidden sm:flex items-center gap-3 mr-1">
              <NavLink to="/preparations" className={({isActive}) => `text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-100'} hover:text-indigo-500`}>
                Preparations
              </NavLink>
            </nav>
            {/* Mobile quick link to Preparations */}
            <Link
              to="/preparations"
              className="inline-flex sm:hidden px-2 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-100 hover:text-indigo-500"
              aria-label="Preparations"
            >
              Preparations
            </Link>
            {/* Desktop menu quick add */}
            <Link
              to="/add"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-md bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] hover:shadow focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm font-medium"
            >
              + New
            </Link>
            {/* Notifications */}
            <div className="relative flex-shrink-0" ref={notificationsRef}>
              <button
                aria-label="Notifications"
                className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 hover:text-indigo-500 transition-colors duration-200"
                title="Notifications"
                onClick={() => setShowNotifications((v) => !v)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {Math.min(9, unreadCount)}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 max-w-[90vw] max-h-96 overflow-auto rounded-md shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="font-semibold text-sm">Notifications</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{notifications.length || 0}</span>
                      <button
                        className={`text-xs ${unreadCount > 0 ? 'text-blue-600 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
                        onClick={async () => {
                          const email = user?.email?.toLowerCase().trim();
                          if (!email || !supabase || unreadCount === 0) return;
                          try {
                            await (supabase as any)
                              .from("notifications")
                              .update({ read: true })
                              .eq("recipient", email);
                          } catch {}
                          fetchNotifications?.(email);
                        }}
                        title="Mark all as read"
                        disabled={unreadCount === 0}
                      >
                        Mark all as read
                      </button>
                    </div>
                  </div>
                  <div className="py-1">
                    {(!notifications || notifications.length === 0) && (
                      <div className="px-3 py-4 text-sm text-gray-500">No notifications</div>
                    )}
                    {notifications?.map?.((n: any) => (
                      <button
                        key={n.id}
                        onClick={async () => {
                          try {
                            await (supabase as any)
                              .from("notifications")
                              .update({ read: true })
                              .eq("id", n.id);
                          } catch {}
                          setShowNotifications(false);
                          if (n.link) {
                            navigate(n.link);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          !n.read ? 'bg-blue-50 dark:bg-blue-900/20' : 'opacity-70'
                        }`}
                      >
                        <div className="text-gray-800 dark:text-gray-100">{n.message}</div>
                        <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                      </button>
                    ))}
                    {/* Footer action for small screens */}
                    <div className="sticky bottom-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 mt-1">
                      <button
                        className={`w-full text-center px-3 py-2 text-sm ${unreadCount > 0 ? 'text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700' : 'text-gray-400 cursor-not-allowed'}`}
                        onClick={async () => {
                          const email = user?.email?.toLowerCase().trim();
                          if (!email || !supabase || unreadCount === 0) return;
                          try {
                            await (supabase as any)
                              .from("notifications")
                              .update({ read: true })
                              .eq("recipient", email);
                          } catch {}
                          fetchNotifications?.(email);
                        }}
                        disabled={unreadCount === 0}
                        title="Mark all as read"
                      >
                        Mark all as read
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Mobile visible Logout button */}
            {user && (
              <button
                onClick={async () => {
                  if (loggingOut) return;
                  setLoggingOut(true);
                  try {
                    await signOut();
                    try {
                      resetStore();
                      if (typeof localStorage !== 'undefined') {
                        localStorage.removeItem('moments-store');
                      }
                    } catch {}
                    setMenuOpen(false);
                    setShowNotifications(false);
                    setAccountMenuOpen(false);
                  } finally {
                    setLoggingOut(false);
                  }
                }}
                disabled={loggingOut}
                aria-label="Log out"
                title="Log out"
                className={`inline-flex sm:hidden flex-shrink-0 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium transition-colors duration-200 active:scale-95 ${
                  loggingOut
                    ? "opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {loggingOut ? "…" : "Logout"}
              </button>
            )}
            {/* Profile / Account Menu */}
            {user ? (
              <div className="relative flex items-center gap-2 flex-shrink-0" ref={accountMenuRef}>
                <button
                  className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-blue-400 font-medium transition-colors duration-200 px-2 py-1 rounded"
                  onClick={() => {
                    setAccountMenuOpen((v) => !v);
                    setShowNotifications(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  title="Account menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700">{initials}</div>
                  <span className="hidden sm:inline">{displayName}</span>
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
                    <Link
                      to="/profile"
                      onClick={() => setAccountMenuOpen(false)}
                      className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={async () => {
                        if (loggingOut) return;
                        setLoggingOut(true);
                        try {
                          await signOut();
                          try {
                            resetStore();
                            if (typeof localStorage !== 'undefined') {
                              localStorage.removeItem('moments-store');
                            }
                          } catch {}
                          setMenuOpen(false);
                          setShowNotifications(false);
                          setAccountMenuOpen(false);
                        } finally {
                          setLoggingOut(false);
                        }
                      }}
                      disabled={loggingOut}
                      className={`block w-full text-left px-3 py-2 text-sm rounded-b-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        loggingOut ? 'opacity-50 cursor-not-allowed' : ''
                      } text-red-600`}
                    >
                      {loggingOut ? 'Logging out…' : 'Log out'}
                    </button>
                  </div>
                )}

                {/* Visible Logout on desktop (quick action) */}
                <button
                  onClick={async () => {
                    if (loggingOut) return;
                    setLoggingOut(true);
                    try {
                      await signOut();
                      try {
                        resetStore();
                        if (typeof localStorage !== 'undefined') {
                          localStorage.removeItem('moments-store');
                        }
                      } catch {}
                      setMenuOpen(false);
                      setShowNotifications(false);
                      setAccountMenuOpen(false);
                    } finally {
                      setLoggingOut(false);
                    }
                  }}
                  disabled={loggingOut}
                  className={`hidden sm:inline-flex px-3 py-1.5 ml-1 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium transition-all duration-200 active:scale-95 ${
                    loggingOut
                      ? "opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  title="Log out"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
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
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 dark:text-gray-100">
        <Outlet />
      </div>
    </div>
  );
}
