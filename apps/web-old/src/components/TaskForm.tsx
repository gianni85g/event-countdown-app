import { useState } from "react";
import { Task } from "@moments/shared";

interface TaskFormProps {
  initialValues?: Partial<Task>;
  onSubmit: (data: { text: string; owner?: string; completionDate?: string; reminderEnabled?: boolean }) => void;
  onCancel?: () => void;
  title?: string;
}

export function TaskForm({ initialValues, onSubmit, onCancel, title = "Add a Preparation Step" }: TaskFormProps) {
  const [taskText, setTaskText] = useState(initialValues?.text || "");
  const [taskOwner, setTaskOwner] = useState(initialValues?.owner || "");
  const [taskCompletionDate, setTaskCompletionDate] = useState(
    initialValues?.completionDate ? initialValues.completionDate.slice(0, 10) : ""
  );
  const [reminderEnabled, setReminderEnabled] = useState(
    initialValues?.reminderEnabled ?? true
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskText.trim()) {
      onSubmit({
        text: taskText.trim(),
        owner: taskOwner.trim() || undefined,
        completionDate: taskCompletionDate || undefined,
        reminderEnabled
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preparation step</label>
          <input
            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What needs to be done?"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Owner (optional)</label>
          <input
            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Who is responsible for this step?"
            value={taskOwner}
            onChange={(e) => setTaskOwner(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target date (optional)</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={taskCompletionDate}
            onChange={(e) => setTaskCompletionDate(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <input
            type="checkbox"
            id="reminderEnabled"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="w-4 h-4 text-blue-500 rounded focus:ring-blue-400"
          />
          <label htmlFor="reminderEnabled" className="text-sm text-gray-700">
            Enable reminder 1 day before due date
          </label>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!taskText.trim()}
          >
            Save
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
