import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useEventStore } from "../store/useEventStore";
const CATEGORIES = [
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
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("personal");
    const [reminderDays, setReminderDays] = useState(3);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const dateInputRef = useRef(null);
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
        return (_jsx("div", { className: "text-gray-600 py-8", children: "Moment not found." }));
    }
    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this moment? This action cannot be undone.")) {
            setDeleting(true);
            try {
                await removeEvent(event.id);
                setSuccess(true);
                setTimeout(() => navigate("/"), 300);
            }
            catch (err) {
                setError("Failed to delete moment.");
                setDeleting(false);
            }
        }
    };
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
        }
        catch (err) {
            setError('Failed to save changes. Please try again.');
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "max-w-md", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "Edit Moment" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-700", children: "Moment Name" }), _jsx("input", { className: "border rounded w-full px-2 py-1", value: name, onChange: (e) => setName(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-700", children: "Date of the Moment" }), _jsx("input", { ref: dateInputRef, type: "date", required: true, className: "border border-gray-300 rounded-lg px-3 py-2 w-full", value: date, onChange: (e) => setDate(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-700", children: "Type of Moment" }), _jsx("select", { className: "border rounded w-full px-2 py-1", value: category, onChange: (e) => setCategory(e.target.value), children: CATEGORIES.map((cat) => (_jsxs("option", { value: cat.id, children: [cat.emoji, " ", cat.label] }, cat.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-700", children: "Why it Matters" }), _jsx("textarea", { className: "border rounded w-full px-2 py-1", rows: 3, value: description, onChange: (e) => setDescription(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-700", children: "Reminder" }), _jsxs("select", { className: "border rounded w-full px-2 py-1", value: reminderDays, onChange: (e) => setReminderDays(Number(e.target.value)), children: [_jsx("option", { value: 1, children: "1 day before" }), _jsx("option", { value: 3, children: "3 days before" }), _jsx("option", { value: 7, children: "1 week before" })] })] })] }), error && (_jsxs("p", { className: "text-red-500 text-sm font-medium mt-2", children: ["\u274C ", error] })), _jsxs("div", { className: "mt-4 flex gap-3", children: [_jsx("button", { className: "px-4 py-2 rounded bg-blue-600 text-white", onClick: handleSubmit, children: "Save" }), _jsx("button", { className: "px-4 py-2 rounded border", onClick: () => navigate(-1), children: "Cancel" }), _jsx("button", { className: "px-4 py-2 rounded bg-red-200 hover:bg-red-300 text-red-800", onClick: handleDelete, children: "Cancel Moment" })] })] }));
}
