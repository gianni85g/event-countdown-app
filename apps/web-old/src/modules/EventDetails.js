import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useRef } from "react";
import { getCountdown } from "@moments/shared";
import { useEventStore } from "../store/useEventStore";
import { TaskForm } from "../components/TaskForm";
import { Bell, BellRing } from "lucide-react";
const CATEGORIES = [
    { id: "birthday", label: "Birthday", emoji: "🎂", color: "bg-pink-200" },
    { id: "work", label: "Work / Meeting", emoji: "💼", color: "bg-blue-200" },
    { id: "travel", label: "Travel", emoji: "🌍", color: "bg-teal-200" },
    { id: "education", label: "Education", emoji: "🎓", color: "bg-indigo-200" },
    { id: "personal", label: "Personal", emoji: "❤️", color: "bg-rose-200" }
];
function getCategoryInfo(category) {
    return CATEGORIES.find(cat => cat.id === category) || CATEGORIES[4];
}
function getTaskCountdownColor(daysLeft) {
    if (daysLeft < 3)
        return "text-red-600";
    if (daysLeft <= 10)
        return "text-yellow-500";
    return "text-green-600";
}
export function EventDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const events = useEventStore((s) => s.events);
    const event = events.find((e) => e.id === id);
    const addTask = useEventStore((s) => s.addTask);
    const toggleTask = useEventStore((s) => s.toggleTask);
    const removeEvent = useEventStore((s) => s.removeEvent);
    const removeTask = useEventStore((s) => s.removeTask);
    const updateTask = useEventStore((s) => s.updateTask);
    const addComment = useEventStore((s) => s.addComment);
    const removeComment = useEventStore((s) => s.removeComment);
    const updateEvent = useEventStore((s) => s.updateEvent);
    const shareMoment = useEventStore((s) => s.shareMoment);
    const [showShare, setShowShare] = useState(false);
    const [shareEmail, setShareEmail] = useState("");
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [showAddTaskForm, setShowAddTaskForm] = useState(false);
    const [content, setContent] = useState("");
    const [file, setFile] = useState(null);
    const [, forceUpdate] = useState({});
    const fileInputRef = useRef(null);
    const countdown = useMemo(() => (event ? getCountdown(event.date) : ""), [event]);
    if (!event) {
        return (_jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Moment not found." }), _jsx(Link, { to: "/", className: "text-blue-600", children: "Back" })] }));
    }
    // Check if moment is pending (invitation not accepted)
    if (event.status === "pending") {
        return (_jsx("div", { className: "text-center mt-10", children: _jsxs("div", { className: "bg-yellow-50 dark:bg-yellow-900/20 border-2 border-dashed border-yellow-400 dark:border-yellow-600 rounded-lg p-6 max-w-md mx-auto", children: [_jsx("p", { className: "text-gray-700 dark:text-gray-300 italic mb-2", children: "You've been invited to collaborate on this Moment." }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 text-sm", children: "Please accept it on your dashboard to start planning." }), _jsx(Link, { to: "/", className: "mt-4 inline-block px-4 py-2 rounded-md bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-200", children: "Go to Dashboard" })] }) }));
    }
    const categoryInfo = getCategoryInfo(event.category);
    const isPast = new Date(event.date) < new Date();
    const updateReflection = useEventStore((s) => s.updateReflection);
    const [newReflection, setNewReflection] = useState("");
    const [reflectionPhotoB64, setReflectionPhotoB64] = useState(null);
    const handleAddTask = async (data) => {
        await addTask(event.id, data.text, data.owner, data.completionDate, data.reminderEnabled);
        setShowAddTaskForm(false);
    };
    const handleEditTask = (taskId) => {
        setEditingTaskId(taskId);
    };
    const handleUpdateTask = async (data) => {
        if (editingTaskId) {
            await updateTask(event.id, editingTaskId, {
                text: data.text,
                title: data.text,
                owner: data.owner,
                completionDate: data.completionDate,
                reminderEnabled: data.reminderEnabled
            });
            setEditingTaskId(null);
        }
    };
    const handleCancelEdit = () => {
        setEditingTaskId(null);
    };
    const handleFileSelect = (e) => {
        const selected = e.target.files?.[0];
        if (selected)
            setFile(selected);
    };
    const handleSubmitComment = async () => {
        if ((!content.trim() && !file) || !id || !event)
            return;
        const newComment = {
            id: crypto.randomUUID(),
            author: "",
            content: content.trim(),
            timestamp: new Date().toISOString(),
        };
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const commentWithFile = {
                    ...newComment,
                    fileUrl: reader.result,
                    fileName: file.name,
                };
                await addComment(id, commentWithFile);
                setContent("");
                setFile(null);
                forceUpdate({});
            };
            reader.readAsDataURL(file);
        }
        else {
            await addComment(id, newComment);
            setContent("");
            forceUpdate({});
        }
    };
    const handleReflectionPhotoSelect = (e) => {
        const selected = e.target.files?.[0];
        if (!selected)
            return;
        const reader = new FileReader();
        reader.onloadend = () => setReflectionPhotoB64(reader.result);
        reader.readAsDataURL(selected);
    };
    const handleSaveReflection = async () => {
        await updateReflection(event.id, { text: newReflection.trim() || undefined, photoUrl: reflectionPhotoB64 || undefined });
        setNewReflection("");
        setReflectionPhotoB64(null);
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("h1", { className: "text-2xl font-bold", children: [categoryInfo.emoji, " ", event.name || event.title] }), _jsxs("span", { className: "text-gray-600", children: ["(", countdown, ")"] }), _jsx(Link, { to: `/edit/${event.id}`, className: "bg-blue-200 hover:bg-blue-300 rounded px-2 py-1 text-sm", children: "Edit" })] }), _jsx("div", { className: `inline-block px-2 py-1 rounded text-xs mt-1 ${categoryInfo.color}`, children: categoryInfo.label }), _jsx("div", { className: "mt-2", children: _jsx("button", { className: "text-sm text-blue-600 hover:underline", onClick: () => setShowShare(true), children: "Share" }) }), event.lastEdited && (_jsxs("div", { className: "text-xs text-gray-600 mt-1", children: ["Last edited: ", new Date(event.lastEdited).toLocaleString()] })), event.description && (_jsx("p", { className: "text-gray-600 mt-1", children: event.description })), _jsxs("div", { className: "mt-6", children: [_jsx("h2", { className: "font-semibold mb-2", children: "Preparation Steps" }), !showAddTaskForm && (_jsx("button", { className: "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 mb-4", onClick: () => setShowAddTaskForm(true), children: "Add a Preparation Step" })), showAddTaskForm && (_jsx("div", { className: "mb-6", children: _jsx(TaskForm, { onSubmit: handleAddTask, onCancel: () => setShowAddTaskForm(false), title: "Add a Preparation Step" }) })), _jsxs("ul", { className: "space-y-3", children: [event.tasks.map((t) => {
                                const daysLeft = t.completionDate ? Math.ceil((new Date(t.completionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                                const countdownText = daysLeft < 0 ? "⚠️ Past due" : `⏳ ${daysLeft} days left`;
                                return (_jsx("li", { className: "bg-white border rounded p-3", children: editingTaskId === t.id ? (_jsx(TaskForm, { initialValues: t, onSubmit: handleUpdateTask, onCancel: handleCancelEdit, title: "Edit Preparation Step" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("input", { type: "checkbox", checked: t.completed || t.done, onChange: () => toggleTask(event.id, t.id) }), _jsxs("div", { className: "flex items-center gap-2 flex-1", children: [_jsx("span", { className: `${(t.completed || t.done) ? "line-through text-gray-500" : ""}`, children: t.text || t.title }), t.completionDate && (_jsx("span", { title: `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}${!t.reminderEnabled ? " (reminder disabled)" : ""}`, className: `text-sm ${!t.reminderEnabled
                                                                    ? "text-gray-300 opacity-50"
                                                                    : daysLeft !== null && daysLeft <= 1
                                                                        ? "text-red-500 animate-pulse"
                                                                        : "text-gray-400"}`, children: daysLeft !== null && daysLeft <= 1 ? (_jsx(BellRing, { size: 16 })) : (_jsx(Bell, { size: 16 })) }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "bg-blue-200 hover:bg-blue-300 rounded px-2 py-1 text-sm", onClick: () => handleEditTask(t.id), children: "\u270E Edit" }), _jsx("button", { className: "bg-red-200 hover:bg-red-300 rounded px-2 py-1 text-sm text-red-800", onClick: async () => {
                                                                    if (window.confirm("Delete this preparation step?")) {
                                                                        await removeTask(event.id, t.id);
                                                                    }
                                                                }, children: "\uD83D\uDDD1\uFE0F Delete" })] })] }), _jsxs("div", { className: "text-sm text-gray-600 space-y-1", children: [t.owner && _jsxs("div", { children: ["Owner: ", t.owner] }), t.completionDate && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { children: ["Target: ", new Date(t.completionDate).toLocaleDateString()] }), _jsx("span", { className: `font-medium ${getTaskCountdownColor(daysLeft)}`, children: countdownText })] })), (t.completed || t.done) && t.completionDate && (_jsxs("div", { className: "text-green-600", children: ["\u2705 Completed: ", new Date(t.completionDate).toLocaleDateString()] }))] })] })) }, t.id));
                            }), event.tasks.length === 0 && (_jsx("li", { className: "text-sm text-gray-600", children: "No tasks yet." }))] })] }), isPast && (_jsxs("section", { className: "mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "\uD83D\uDCDD Reflection" }), !event.reflection ? (_jsxs(_Fragment, { children: [_jsx("textarea", { className: "w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 text-sm", placeholder: "How was this moment? Share your thoughts...", value: newReflection, onChange: (e) => setNewReflection(e.target.value) }), _jsxs("div", { className: "mt-3 flex items-center gap-2", children: [_jsx("input", { type: "file", accept: "image/*", onChange: handleReflectionPhotoSelect }), _jsx("button", { onClick: handleSaveReflection, className: "px-3 py-1 bg-indigo-500 text-white rounded-md", children: "Save Reflection" })] })] })) : (_jsxs("div", { children: [_jsx("p", { className: "text-gray-700 dark:text-gray-300 whitespace-pre-line", children: event.reflection }), event.reflectionPhoto && (_jsx("img", { src: event.reflectionPhoto, alt: "Moment Memory", className: "mt-3 rounded-lg w-full max-w-md" }))] }))] })), showShare && (_jsx("div", { className: "fixed inset-0 bg-black/40 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-4 w-80 shadow", children: [_jsx("h3", { className: "font-semibold mb-2", children: "Share this Moment" }), _jsx("input", { type: "email", value: shareEmail, onChange: (e) => setShareEmail(e.target.value), placeholder: "Enter collaborator email", className: "border rounded w-full px-2 py-1 mb-2" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { className: "text-gray-600", onClick: () => setShowShare(false), children: "Cancel" }), _jsx("button", { className: "bg-blue-600 text-white rounded px-3 py-1", onClick: async () => {
                                        if (!shareEmail.trim())
                                            return;
                                        const existing = event.shared_with || [];
                                        // Normalize emails: lowercase, trim, remove duplicates
                                        const cleaned = [...existing, shareEmail.trim()]
                                            .map((e) => e.trim().toLowerCase())
                                            .filter((e, i, arr) => e && arr.indexOf(e) === i);
                                        await shareMoment(event.id, cleaned);
                                        setShowShare(false);
                                        setShareEmail("");
                                    }, children: "Share" })] })] }) })), _jsxs("section", { className: "mt-8 border-t pt-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-3", children: "\uD83D\uDCAC Conversation" }), _jsxs("div", { className: "flex flex-col gap-2 mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("textarea", { placeholder: "Write a thought, link, or video URL...", value: content, onChange: (e) => setContent(e.target.value), className: "flex-1 border rounded px-2 py-2 text-sm h-20" }), _jsx("button", { type: "button", onClick: () => fileInputRef.current?.click(), className: "bg-gray-100 border rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-200 transition", title: "Add a file or photo", children: "+" }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*,.pdf,.txt", onChange: handleFileSelect, className: "hidden" })] }), file && (_jsxs("p", { className: "text-xs text-gray-500", children: ["\uD83D\uDCCE ", file.name] })), _jsx("button", { onClick: handleSubmitComment, className: "self-end bg-blue-500 text-white text-sm px-3 py-1 rounded hover:bg-blue-600 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95]", children: "Post" })] }), _jsx("div", { className: "space-y-3", children: event?.comments?.length ? (event.comments
                            .slice()
                            .reverse()
                            .map((c) => {
                            const isVideo = c.content.includes("youtube.com") ||
                                c.content.includes("youtu.be") ||
                                c.content.includes("vimeo.com");
                            const isLink = !isVideo &&
                                (c.content.startsWith("http://") || c.content.startsWith("https://"));
                            return (_jsxs("div", { className: "bg-gray-50 border rounded-lg p-3 shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("p", { className: "text-xs text-gray-400", children: new Date(c.timestamp).toLocaleString() }), _jsx("button", { className: "text-xs text-red-500 hover:text-red-700 hover:underline", onClick: async () => {
                                                    if (window.confirm("Delete this comment?")) {
                                                        await removeComment(event.id, c.id);
                                                    }
                                                }, children: "Delete" })] }), isVideo ? (_jsx("iframe", { src: c.content.replace("watch?v=", "embed/"), title: "video comment", className: "w-full aspect-video rounded", allowFullScreen: true })) : isLink ? (_jsx("a", { href: c.content, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:underline break-all", children: c.content })) : (_jsx("p", { className: "text-sm text-gray-700", children: c.content })), c.fileUrl && (_jsx("div", { className: "mt-2", children: c.fileUrl.startsWith("data:image") ? (_jsx("img", { src: c.fileUrl, alt: c.fileName || "uploaded image", className: "rounded-md max-h-64 object-cover w-full" })) : (_jsxs("a", { href: c.fileUrl, download: c.fileName, className: "text-blue-600 hover:underline block", children: ["\uD83D\uDCCE ", c.fileName || "Download file"] })) }))] }, c.id));
                        })) : (_jsx("p", { className: "text-gray-400 italic text-sm", children: "No comments yet \u2014 share something \u2728" })) })] }), _jsx("div", { className: "mt-8 flex gap-3", children: _jsx(Link, { className: "text-blue-600", to: "/", children: "Back" }) })] }));
}
