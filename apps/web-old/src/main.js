import { jsx as _jsx } from "react/jsx-runtime";
import { Suspense, lazy } from "react";
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
        element: (_jsx(Suspense, { fallback: _jsx("div", { className: "p-6 text-center text-gray-500", children: "Loading\u2026" }), children: _jsx(Login, {}) }))
    },
    {
        path: "/reset-password",
        element: (_jsx(Suspense, { fallback: _jsx("div", { className: "p-6 text-center text-gray-500", children: "Loading\u2026" }), children: _jsx(ResetPassword, {}) }))
    },
    {
        path: "/",
        element: _jsx(App, {}),
        children: [
            {
                index: true,
                element: (_jsx(Suspense, { fallback: _jsx("div", { className: "p-6 text-center text-gray-500", children: "Loading\u2026" }), children: _jsx(Home, {}) }))
            },
            {
                path: "event/:id",
                element: (_jsx(Suspense, { fallback: _jsx("div", { className: "p-6 text-center text-gray-500", children: "Loading\u2026" }), children: _jsx(EventDetails, {}) }))
            },
            {
                path: "add",
                element: (_jsx(Suspense, { fallback: _jsx("div", { className: "p-6 text-center text-gray-500", children: "Loading\u2026" }), children: _jsx(AddEvent, {}) }))
            },
            {
                path: "edit/:id",
                element: (_jsx(Suspense, { fallback: _jsx("div", { className: "p-6 text-center text-gray-500", children: "Loading\u2026" }), children: _jsx(EditEvent, {}) }))
            },
            {
                path: "preparations",
                element: (_jsx(Suspense, { fallback: _jsx("div", { className: "p-6 text-center text-gray-500", children: "Loading\u2026" }), children: _jsx(Home, {}) }))
            },
            {
                path: "profile",
                element: (_jsx(Suspense, { fallback: _jsx("div", { className: "p-6 text-center text-gray-500", children: "Loading\u2026" }), children: _jsx(Profile, {}) }))
            },
            {
                path: "memories",
                element: (_jsx(Suspense, { fallback: _jsx("div", { className: "p-6 text-center text-gray-500", children: "Loading\u2026" }), children: _jsx(Memories, {}) }))
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
