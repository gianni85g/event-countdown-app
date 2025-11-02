export type Comment = {
  id: string;
  author: string;
  content: string;
  timestamp: string; // ISO string
  fileUrl?: string; // base64 for local image/file
  fileName?: string; // for display if not image
};

export type Task = {
  id: string;
  text: string;
  owner?: string;
  completionDate?: string; // ISO string
  done: boolean;
  notified?: boolean; // Track if reminder has been sent
  reminderEnabled?: boolean; // Control whether reminders are active
  // Back-compat fields used elsewhere
  title?: string;
  completed?: boolean;
};

export type EventItem = {
  id: string;
  // New field for web spec
  title?: string;
  // Back-compat
  name?: string;
  date: string; // ISO string
  description?: string;
  category: EventCategory;
  tasks: Task[];
  notes?: string;
  lastEdited?: string; // ISO timestamp
  reminderDays?: number; // Days before event to send reminder
  comments?: Comment[]; // Conversation/comments for this moment
  // Memories / Reflection
  reflection?: string;
  reflectionPhoto?: string;
  // Derived flag for UI
  isPast?: boolean;
};

export type EventCategory = "birthday" | "work" | "travel" | "education" | "personal";

export type StorageAdapter = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem?(key: string): Promise<void> | void;
};

