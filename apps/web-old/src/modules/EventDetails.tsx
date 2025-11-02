import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect, useRef } from "react";
import { getCountdown, Comment } from "@moments/shared";
import { useEventStore } from "../store/useEventStore";
import { EventCategory, Task } from "@moments/shared";
import { TaskForm } from "../components/TaskForm";
import { Bell, BellRing } from "lucide-react";

const CATEGORIES: { id: EventCategory; label: string; emoji: string; color: string }[] = [
  { id: "birthday", label: "Birthday", emoji: "🎂", color: "bg-pink-200" },
  { id: "work", label: "Work / Meeting", emoji: "💼", color: "bg-blue-200" },
  { id: "travel", label: "Travel", emoji: "🌍", color: "bg-teal-200" },
  { id: "education", label: "Education", emoji: "🎓", color: "bg-indigo-200" },
  { id: "personal", label: "Personal", emoji: "❤️", color: "bg-rose-200" }
];

function getCategoryInfo(category: EventCategory) {
  return CATEGORIES.find(cat => cat.id === category) || CATEGORIES[4];
}

function getTaskCountdownColor(daysLeft: number) {
  if (daysLeft < 3) return "text-red-600";
  if (daysLeft <= 10) return "text-yellow-500";
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
  const shareMoment = useEventStore((s) => (s as any).shareMoment);
  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [, forceUpdate] = useState({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const countdown = useMemo(() => (event ? getCountdown(event.date) : ""), [event]);

  if (!event) {
    return (
      <div>
        <p className="text-gray-600">Moment not found.</p>
        <Link to="/" className="text-blue-600">Back</Link>
      </div>
    );
  }

  // Check if moment is pending (invitation not accepted)
  if ((event as any).status === "pending") {
    return (
      <div className="text-center mt-10">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-dashed border-yellow-400 dark:border-yellow-600 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-gray-700 dark:text-gray-300 italic mb-2">
            You've been invited to collaborate on this Moment.
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Please accept it on your dashboard to start planning.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block px-4 py-2 rounded-md bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-200"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const categoryInfo = getCategoryInfo(event.category);
  const isPast = new Date(event.date) < new Date();
  const updateReflection = useEventStore((s: any) => s.updateReflection);
  const [newReflection, setNewReflection] = useState("");
  const [reflectionPhotoB64, setReflectionPhotoB64] = useState<string | null>(null);

  const handleAddTask = async (data: { text: string; owner?: string; completionDate?: string; reminderEnabled?: boolean }) => {
    await addTask(event.id, data.text, data.owner, data.completionDate, data.reminderEnabled);
    setShowAddTaskForm(false);
  };

  const handleEditTask = (taskId: string) => {
    setEditingTaskId(taskId);
  };

  const handleUpdateTask = async (data: { text: string; owner?: string; completionDate?: string; reminderEnabled?: boolean }) => {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleSubmitComment = async () => {
    if ((!content.trim() && !file) || !id || !event) return;
    
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
          fileUrl: reader.result as string,
          fileName: file.name,
        };
        
        await addComment(id, commentWithFile);
        
        setContent("");
        setFile(null);
        forceUpdate({});
      };
      reader.readAsDataURL(file);
    } else {
      await addComment(id, newComment);
      
      setContent("");
      forceUpdate({});
    }
  };

  const handleReflectionPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const reader = new FileReader();
    reader.onloadend = () => setReflectionPhotoB64(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleSaveReflection = async () => {
    await updateReflection(event.id, { text: newReflection.trim() || undefined, photoUrl: reflectionPhotoB64 || undefined });
    setNewReflection("");
    setReflectionPhotoB64(null);
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">
          {categoryInfo.emoji} {event.name || event.title}
        </h1>
        <span className="text-gray-600">({countdown})</span>
        <Link
          to={`/edit/${event.id}`}
          className="bg-blue-200 hover:bg-blue-300 rounded px-2 py-1 text-sm"
        >
          Edit
        </Link>
      </div>
      <div className={`inline-block px-2 py-1 rounded text-xs mt-1 ${categoryInfo.color}`}>
        {categoryInfo.label}
      </div>
      <div className="mt-2">
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setShowShare(true)}
        >
          Share
        </button>
      </div>
      {event.lastEdited && (
        <div className="text-xs text-gray-600 mt-1">
          Last edited: {new Date(event.lastEdited).toLocaleString()}
        </div>
      )}
      {event.description && (
        <p className="text-gray-600 mt-1">{event.description}</p>
      )}

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Preparation Steps</h2>
        
        {/* Add Task Button */}
        {!showAddTaskForm && (
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 mb-4"
            onClick={() => setShowAddTaskForm(true)}
          >
            Add a Preparation Step
          </button>
        )}

        {/* Add Task Form */}
        {showAddTaskForm && (
          <div className="mb-6">
            <TaskForm
              onSubmit={handleAddTask}
              onCancel={() => setShowAddTaskForm(false)}
              title="Add a Preparation Step"
            />
        </div>
        )}

        <ul className="space-y-3">
          {event.tasks.map((t) => {
            const daysLeft = t.completionDate ? Math.ceil((new Date(t.completionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
            const countdownText = daysLeft < 0 ? "⚠️ Past due" : `⏳ ${daysLeft} days left`;
            
            return (
              <li key={t.id} className="bg-white border rounded p-3">
                {editingTaskId === t.id ? (
                  <TaskForm
                    initialValues={t}
                    onSubmit={handleUpdateTask}
                    onCancel={handleCancelEdit}
                    title="Edit Preparation Step"
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                        checked={t.completed || t.done}
                onChange={() => toggleTask(event.id, t.id)}
              />
                      <div className="flex items-center gap-2 flex-1">
                        <span className={`${(t.completed || t.done) ? "line-through text-gray-500" : ""}`}>
                          {t.text || t.title}
                        </span>
                        {t.completionDate && (
                          <span
                            title={`Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}${!t.reminderEnabled ? " (reminder disabled)" : ""}`}
                            className={`text-sm ${
                              !t.reminderEnabled 
                                ? "text-gray-300 opacity-50"
                                : daysLeft !== null && daysLeft <= 1
                                ? "text-red-500 animate-pulse"
                                : "text-gray-400"
                            }`}
                          >
                            {daysLeft !== null && daysLeft <= 1 ? (
                              <BellRing size={16} />
                            ) : (
                              <Bell size={16} />
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="bg-blue-200 hover:bg-blue-300 rounded px-2 py-1 text-sm"
                          onClick={() => handleEditTask(t.id)}
                        >
                          ✎ Edit
                        </button>
                        <button
                          className="bg-red-200 hover:bg-red-300 rounded px-2 py-1 text-sm text-red-800"
                          onClick={async () => {
                            if (window.confirm("Delete this preparation step?")) {
                              await removeTask(event.id, t.id);
                            }
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {t.owner && <div>Owner: {t.owner}</div>}
                      {t.completionDate && (
                        <div className="flex items-center gap-2">
                          <span>Target: {new Date(t.completionDate).toLocaleDateString()}</span>
                          <span className={`font-medium ${getTaskCountdownColor(daysLeft)}`}>
                            {countdownText}
                          </span>
                        </div>
                      )}
                      {(t.completed || t.done) && t.completionDate && (
                        <div className="text-green-600">
                          ✅ Completed: {new Date(t.completionDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </>
                )}
            </li>
            );
          })}
          {event.tasks.length === 0 && (
            <li className="text-sm text-gray-600">No tasks yet.</li>
          )}
        </ul>
      </div>

      {isPast && (
        <section className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
          <h3 className="text-lg font-semibold mb-2">📝 Reflection</h3>
          {!(event as any).reflection ? (
            <>
              <textarea
                className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 text-sm"
                placeholder="How was this moment? Share your thoughts..."
                value={newReflection}
                onChange={(e) => setNewReflection(e.target.value)}
              />
              <div className="mt-3 flex items-center gap-2">
                <input type="file" accept="image/*" onChange={handleReflectionPhotoSelect} />
                <button
                  onClick={handleSaveReflection}
                  className="px-3 py-1 bg-indigo-500 text-white rounded-md"
                >
                  Save Reflection
                </button>
              </div>
            </>
          ) : (
            <div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{(event as any).reflection}</p>
              {(event as any).reflectionPhoto && (
                <img
                  src={(event as any).reflectionPhoto}
                  alt="Moment Memory"
                  className="mt-3 rounded-lg w-full max-w-md"
                />
              )}
            </div>
          )}
        </section>
      )}

      {/* Share Modal (simple) */}
      {showShare && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-80 shadow">
            <h3 className="font-semibold mb-2">Share this Moment</h3>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="Enter collaborator email"
              className="border rounded w-full px-2 py-1 mb-2"
            />
            <div className="flex justify-end gap-2">
              <button className="text-gray-600" onClick={() => setShowShare(false)}>Cancel</button>
              <button
                className="bg-blue-600 text-white rounded px-3 py-1"
                onClick={async () => {
                  if (!shareEmail.trim()) return;
                  const existing = (event as any).shared_with || [];
                  // Normalize emails: lowercase, trim, remove duplicates
                  const cleaned = [...(existing as any[]), shareEmail.trim()]
                    .map((e) => e.trim().toLowerCase())
                    .filter((e, i, arr) => e && arr.indexOf(e) === i);
                  await (shareMoment as any)(event.id, cleaned);
                  setShowShare(false);
                  setShareEmail("");
                }}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Section */}
      <section className="mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold mb-3">💬 Conversation</h2>

        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2">
            <textarea
              placeholder="Write a thought, link, or video URL..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 border rounded px-2 py-2 text-sm h-20"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-100 border rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-200 transition"
              title="Add a file or photo"
            >
              +
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {file && (
            <p className="text-xs text-gray-500">
              📎 {file.name}
            </p>
          )}

          <button
            onClick={handleSubmitComment}
            className="self-end bg-blue-500 text-white text-sm px-3 py-1 rounded hover:bg-blue-600 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95]"
          >
            Post
          </button>
        </div>

        <div className="space-y-3">
          {event?.comments?.length ? (
            event.comments
              .slice()
              .reverse()
              .map((c) => {
                const isVideo =
                  c.content.includes("youtube.com") ||
                  c.content.includes("youtu.be") ||
                  c.content.includes("vimeo.com");
                const isLink =
                  !isVideo &&
                  (c.content.startsWith("http://") || c.content.startsWith("https://"));
                return (
                  <div
                    key={c.id}
                    className="bg-gray-50 border rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400">
                        {new Date(c.timestamp).toLocaleString()}
                      </p>
                      <button
                        className="text-xs text-red-500 hover:text-red-700 hover:underline"
                        onClick={async () => {
                          if (window.confirm("Delete this comment?")) {
                            await removeComment(event.id, c.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    {isVideo ? (
                      <iframe
                        src={c.content.replace("watch?v=", "embed/")}
                        title="video comment"
                        className="w-full aspect-video rounded"
                        allowFullScreen
                      />
                    ) : isLink ? (
                      <a
                        href={c.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {c.content}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-700">{c.content}</p>
                    )}
                    
                    {/* File/Image Display */}
                    {c.fileUrl && (
                      <div className="mt-2">
                        {c.fileUrl.startsWith("data:image") ? (
                          <img
                            src={c.fileUrl}
                            alt={c.fileName || "uploaded image"}
                            className="rounded-md max-h-64 object-cover w-full"
                          />
                        ) : (
                          <a
                            href={c.fileUrl}
                            download={c.fileName}
                            className="text-blue-600 hover:underline block"
                          >
                            📎 {c.fileName || "Download file"}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            <p className="text-gray-400 italic text-sm">
              No comments yet — share something ✨
            </p>
          )}
        </div>
      </section>

      <div className="mt-8 flex gap-3">
        <Link className="text-blue-600" to="/">Back</Link>
      </div>
    </div>
  );
}