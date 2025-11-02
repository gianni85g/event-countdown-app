import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles.css";
import { App } from "./modules/App";
import { Home } from "./modules/Home";
import { EventDetails } from "./modules/EventDetails";
import { AddEvent } from "./modules/AddEvent";
import { EditEvent } from "./modules/EditEvent";
import Memories from "./modules/Memories";
import Login from "./modules/Login";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
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
        element: _jsx(Login, {})
    },
    {
        path: "/reset-password",
        element: _jsx(ResetPassword, {})
    },
    {
        path: "/",
        element: _jsx(App, {}),
        children: [
            {
                index: true,
                element: _jsx(Home, {})
            },
            {
                path: "event/:id",
                element: _jsx(EventDetails, {})
            },
            {
                path: "add",
                element: _jsx(AddEvent, {})
            },
            {
                path: "edit/:id",
                element: _jsx(EditEvent, {})
            },
            {
                path: "profile",
                element: _jsx(Profile, {})
            },
            {
                path: "memories",
                element: _jsx(Memories, {})
            }
        ]
    }
]);
const root = createRoot(document.getElementById("root"));
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
        }
        catch { }
    }
});
root.render(_jsx(RouterProvider, { router: router }));
