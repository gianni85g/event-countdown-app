import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./styles.css";
import { App } from "./modules/App";
import { Home } from "./modules/Home";
import { EventDetails } from "./modules/EventDetails";
import { AddEvent } from "./modules/AddEvent";
import { EditEvent } from "./modules/EditEvent";
import Login from "./modules/Login";

// Request notification permission on app load
const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
};

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/",
    element: <App />,
    children: [
      { 
        index: true, 
        element: <Home />
      },
      { 
        path: "event/:id", 
        element: <EventDetails />
      },
      { 
        path: Dominion "add", 
        element: <AddEvent />
      },
      { 
        path: "edit/:id", 
        element: <EditEvent />
      }
    ]
  }
]);

const root = createRoot(document.getElementById("root")!);

// Request notification permission when app loads
requestNotificationPermission();

root.render(<RouterProvider router={router} />);



