import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles.css";
import { App } from "./modules/App";
const Home = lazy(() => import("./modules/Home").then(m => ({ default: m.Home })));
const EventDetails = lazy(() => import("./modules/EventDetails").then(m => ({ default: m.EventDetails })));
const AddEvent = lazy(() => import("./modules/AddEvent").then(m => ({ default: m.AddEvent })));
const EditEvent = lazy(() => import("./modules/EditEvent").then(m => ({ default: m.EditEvent })));
const Memories = lazy(() => import("./modules/Memories"));
const Login = lazy(() => import("./modules/Login"));
const Profile = lazy(() => import("./pages/Profile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
import { useAuthStore } from "@moments/shared";
import { useEventStore } from "./store/useEventStore";

// Don't clear on startup - App.tsx handles user-switch detection
// This prevents race conditions with data fetching
console.log("[Startup] App starting...");

// Request notification permission on app load
const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
};

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading…</div>}>
        <Login />
      </Suspense>
    )
  },
  {
    path: "/reset-password",
    element: (
      <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading…</div>}>
        <ResetPassword />
      </Suspense>
    )
  },
  {
    path: "/",
    element: <App />,
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading…</div>}>
            <Home />
          </Suspense>
        )
      },
      { 
        path: "event/:id", 
        element: (
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading…</div>}>
            <EventDetails />
          </Suspense>
        )
      },
      { 
        path: "add", 
        element: (
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading…</div>}>
            <AddEvent />
          </Suspense>
        )
      },
      { 
        path: "edit/:id", 
        element: (
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading…</div>}>
            <EditEvent />
          </Suspense>
        )
      },
      {
        path: "preparations",
        element: (
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading…</div>}>
            <Home />
          </Suspense>
        )
      },
      { 
        path: "profile", 
        element: (
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading…</div>}>
            <Profile />
          </Suspense>
        )
      }
      ,{
        path: "memories",
        element: (
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading…</div>}>
            <Memories />
          </Suspense>
        )
      }
    ]
  }
]);

const root = createRoot(document.getElementById("root")!);

// Request notification permission when app loads
requestNotificationPermission();

// Initialize auth (restore Supabase session) and pre-hydrate moments when available
const authStore = useAuthStore.getState();
authStore.initAuth().then(async () => {
  const user = useAuthStore.getState().user;
  if (user?.id) {
    try {
      const { fetchMoments } = useEventStore.getState();
      await fetchMoments(user.id);
    } catch {}
  }
});

root.render(<RouterProvider router={router} />);

