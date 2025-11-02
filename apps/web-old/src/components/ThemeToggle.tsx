import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", dark);
      localStorage.setItem("theme", dark ? "dark" : "light");
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 active:scale-95 focus:ring-2 focus:ring-blue-400 focus:outline-none"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}



