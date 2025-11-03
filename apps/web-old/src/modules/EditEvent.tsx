import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useEventStore } from "../store/useEventStore";
import { EventCategory, useAuthStore } from "@moments/shared";

const CATEGORIES: { id: EventCategory; label: string; emoji: string; color: string }[] = [
  { id: "birthday", label: "Birthday", emoji: "🎂", color: "bg-pink-200" },
  { id: "work", label: "Work / Meeting", emoji: "💼", color: "bg-blue-200" },
  { id: "travel", label: "Travel", emoji: "🌍", color: "bg-teal-200" },
  { id: "education", label: "Education", emoji: "🎓", color: "bg-indigo-200" },
  { id: "personal", label: "Personal", emoji: "❤️", color: "bg-rose-200" }
];

export function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = useEventStore((s) => s.events.find((e) => e.id === id));
  const updateEvent = useEventStore((s) => s.updateEvent);
  const removeEvent = useEventStore((s) => s.removeEvent);
  const { user } = useAuthStore();

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>("personal");
  const [reminderDays, setReminderDays] = useState(3);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (event) {
      setName(event.name || event.title || "");
      setDate(event.date.slice(0, 10));
      setDescription(event.description || "");
      setCategory(event.category);
      setReminderDays(event.reminderDays || 3);
    }
  }, [event]);

  if (!event) {
    return (
      <div className="text-gray-600 py-8">Moment not found.</div>
    );
  }

  const handleDelete = async () => {
    // Block deletion for shared moments where current user is not the owner
    if ((event as any)?.user_id && user && (event as any).user_id !== user.id) {
      setWarningMessage("This moment cannot be canceled because it was shared with you.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this moment? This action cannot be undone.")) {
      setDeleting(true);
      try {
        await removeEvent(event.id);
        setSuccess(true);
        setTimeout(() => navigate("/"), 300);
      } catch (err) {
        setError("Failed to delete moment.");
        setDeleting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a moment name.');
      return;
    }
    if (!date) {
      setError('Please select a date for your moment.');
      dateInputRef.current?.focus();
      return;
    }

    setError('');
    setSaving(true);
    try {
      await updateEvent(event.id, {
        name,
        title: name,
        date: new Date(date).toISOString(),
        description,
        category,
        reminderDays
      });
      setSuccess(true);
      setTimeout(() => navigate("/"), 500);
    } catch (err) {
      setError('Failed to save changes. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-4">Edit Moment</h1>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-700">Moment Name</label>
          <input
            className="border rounded w-full px-2 py-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Date of the Moment</label>
          <input
            ref={dateInputRef}
            type="date"
            required
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Type of Moment</label>
          <select
            className="border rounded w-full px-2 py-1"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700">Why it Matters</label>
          <textarea
            className="border rounded w-full px-2 py-1"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Reminder</label>
          <select
            className="border rounded w-full px-2 py-1"
            value={reminderDays}
            onChange={(e) => setReminderDays(Number(e.target.value))}
          >
            <option value={1}>1 day before</option>
            <option value={3}>3 days before</option>
            <option value={7}>1 week before</option>
          </select>
        </div>
      </div>
      
      {error && (
        <p className="text-red-500 text-sm font-medium mt-2">
          ❌ {error}
        </p>
      )}
      
      <div className="mt-4 flex gap-3">
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white"
          onClick={handleSubmit}
        >
          Save
        </button>
        <button className="px-4 py-2 rounded border" onClick={() => navigate(-1)}>
          Cancel
        </button>
        <button 
          className="px-4 py-2 rounded bg-red-200 hover:bg-red-300 text-red-800"
          onClick={handleDelete}
        >
          Cancel Moment
        </button>
      </div>
    </div>

    {warningMessage && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-800 dark:text-gray-100 mb-4">{warningMessage}</p>
          <div className="text-right">
            <button
              onClick={() => setWarningMessage(null)}
              className="px-4 py-2 rounded bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )}
  );
}


