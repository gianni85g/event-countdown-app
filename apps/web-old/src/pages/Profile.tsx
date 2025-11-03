import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, supabase } from "@moments/shared";

export default function Profile() {
  const { user, getUser } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.user_metadata?.display_name || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() && !password.trim()) {
      alert("Please change at least one field.");
      return;
    }

    if (!supabase) {
      alert("❌ Supabase not configured. Running in mock mode.");
      return;
    }

    setSaving(true);
    try {
      const updates: any = {};

      // ✅ Update name
      if (name.trim() && name.trim() !== user?.user_metadata?.display_name) {
        updates.display_name = name.trim();
      }

      // Avatar upload disabled in v2 – keeping UI simple

      // ✅ Update metadata if any
      if (Object.keys(updates).length > 0) {
        const { error: metaError } = await supabase.auth.updateUser({
          data: updates,
        });
        if (metaError) throw metaError;
      }

      // ✅ Update password if entered
      if (password.trim()) {
        const { error: passError } = await supabase.auth.updateUser({
          password: password.trim(),
        });
        if (passError) throw passError;
      }

      await getUser();
      alert("✅ Profile updated successfully!");
      navigate("/");
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-xl shadow">
      <h1 className="text-xl font-semibold mb-4 text-center">My Profile</h1>

      {/* Avatar removed for v2 – keeping profile minimal */}

      <div className="flex flex-col gap-3">
        <label className="text-sm text-gray-600">Email</label>
        <input
          type="text"
          value={user?.email || ""}
          disabled
          className="border px-3 py-2 rounded bg-gray-100 text-gray-500"
        />

        <label className="text-sm text-gray-600">Display Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="border px-3 py-2 rounded"
        />

        <label className="text-sm text-gray-600">New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current"
          className="border px-3 py-2 rounded"
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition mt-4"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <button
          onClick={() => navigate("/")}
          className="text-sm text-gray-500 mt-2 underline"
        >
          ← Back to Moments
        </button>
      </div>
    </div>
  );
}
