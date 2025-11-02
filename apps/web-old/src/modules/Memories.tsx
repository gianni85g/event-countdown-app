import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useEventStore } from "../store/useEventStore";

export default function Memories() {
  const events = useEventStore((s) => s.events);
  const past = useMemo(() => events.filter((m: any) => m.isPast || new Date(m.date) < new Date()), [events]);

  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">🕰 Past Moments</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        These moments have already passed, but you can still edit details, add reflections, or update preparations.
      </p>

      {past.length === 0 ? (
        <p className="text-gray-500">No past moments yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {past.map((e) => (
            <div key={e.id} className="relative rounded-2xl p-4 transition-all bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700">
              <span className="absolute top-2 right-3 text-xs px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                ⏳ Past Due
              </span>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">{e.name || e.title}</h3>
              <p className="text-sm text-gray-500">{new Date(e.date).toLocaleDateString()}</p>
              {e.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{e.description}</p>}
              <div className="mt-3 flex gap-2">
                <Link
                  to={`/event/${e.id}`}
                  className="inline-block px-3 py-1.5 rounded-md bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 transition text-sm"
                >
                  Open
                </Link>
                <Link
                  to={`/edit/${e.id}`}
                  className="inline-block bg-blue-200 dark:bg-blue-700 hover:bg-blue-300 dark:hover:bg-blue-600 rounded px-2 py-1 text-sm transition text-gray-700 dark:text-gray-200"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


