import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { useEventStore } from "../store/useEventStore";
const CATEGORIES = [
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
    const [category, setCategory] = useState("personal");
    const [reminderDays, setReminderDays] = useState(3);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    const dateInputRef = useRef(null);
    const handleSubmit = async (e) => {
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
        }
        catch (err) {
            setError('Failed to save moment. Please try again.');
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "max-w-md", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "Add a New Moment" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-700", children: "Moment Name" }), _jsx("input", { className: "border rounded w-full px-2 py-1", value: name, onChange: (e) => setName(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-700", children: "Date of the Moment" }), _jsx("input", { ref: dateInputRef, type: "date", required: true, className: "border border-gray-300 rounded-lg px-3 py-2 w-full", value: date, onChange: (e) => setDate(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-700", children: "Type of Moment" }), _jsx("select", { className: "border rounded w-full px-2 py-1", value: category, onChange: (e) => setCategory(e.target.value), children: CATEGORIES.map((cat) => (_jsxs("option", { value: cat.id, children: [cat.emoji, " ", cat.label] }, cat.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-700", children: "Why it Matters (optional)" }), _jsx("textarea", { className: "border rounded w-full px-2 py-1", rows: 3, value: description, onChange: (e) => setDescription(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-700", children: "Reminder" }), _jsxs("select", { className: "border rounded w-full px-2 py-1", value: reminderDays, onChange: (e) => setReminderDays(Number(e.target.value)), children: [_jsx("option", { value: 1, children: "1 day before" }), _jsx("option", { value: 3, children: "3 days before" }), _jsx("option", { value: 7, children: "1 week before" })] })] })] }), error && (_jsxs("p", { className: "text-red-600 text-sm font-medium mt-2 p-2 bg-red-50 border border-red-200 rounded", children: ["\u274C ", error] })), success && (_jsx("p", { className: "text-green-600 text-sm font-medium mt-2 p-2 bg-green-50 border border-green-200 rounded", children: "\u2705 Moment saved successfully!" })), _jsxs("div", { className: "mt-4 flex gap-3", children: [_jsx("button", { className: "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed", onClick: handleSubmit, disabled: saving, children: saving ? "Saving..." : "Save" }), _jsx("button", { className: "px-4 py-2 rounded border hover:bg-gray-50 transition", onClick: () => navigate(-1), disabled: saving, children: "Cancel" })] })] }));
}
