import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { useEventStore } from "../store/useEventStore";
import { EventCategory } from "@moments/shared";

const CATEGORIES: { id: EventCategory; label: string; emoji: string; color: string }[] = [
  { id: "birthday", label: "Birthday", emoji: "🎂", color: "bg-pink-200" },
  { id: "work", label: "Work / Meeting", emoji: "💼", color: "bg-blue-200" },
  { id: "travel", label: "Travel", emoji: "🌍", color: "bg-teal-200" },
  { id: "education", label: "Education", emoji: "🎓", color: "bg-indigo-200" },
  { id: "personal", label: "Personal", emoji: "❤️", color: "bg-rose-200" }
];

export function AddEvent() {
  const navigate = useNavigate();
  const addEvent = useEventStore((s) => s.addEvent);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>("personal");
  const [reminderDays, setReminderDays] = useState(3);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

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
      const isoDate = new Date(date).toISOString();
      await addEvent({ 
        name, 
        title: name,
        date: isoDate, 
        description, 
        category,
        reminderDays
      });
      setSuccess(true);
      setTimeout(() => navigate("/"), 500);
    } catch (err) {
      setError('Failed to save moment. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-4">Add a New Moment</h1>
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
          <label className="block text-sm text-gray-700">Why it Matters (optional)</label>
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
        <p className="text-red-600 text-sm font-medium mt-2 p-2 bg-red-50 border border-red-200 rounded">
          ❌ {error}
        </p>
      )}
      
      {success && (
        <p className="text-green-600 text-sm font-medium mt-2 p-2 bg-green-50 border border-green-200 rounded">
          ✅ Moment saved successfully!
        </p>
      )}
      
      <div className="mt-4 flex gap-3">
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button 
          className="px-4 py-2 rounded border hover:bg-gray-50 transition" 
          onClick={() => navigate(-1)}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

