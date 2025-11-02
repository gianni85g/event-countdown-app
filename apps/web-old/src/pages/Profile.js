import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, supabase } from "@moments/shared";
export default function Profile() {
    const { user, getUser } = useAuthStore();
    const navigate = useNavigate();
    const [name, setName] = useState(user?.user_metadata?.display_name || "");
    const [password, setPassword] = useState("");
    const [avatar, setAvatar] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
    const [saving, setSaving] = useState(false);
    const handleSave = async () => {
        if (!name.trim() && !password.trim() && !avatar) {
            alert("Please change at least one field.");
            return;
        }
        if (!supabase) {
            alert("❌ Supabase not configured. Running in mock mode.");
            return;
        }
        setSaving(true);
        try {
            const updates = {};
            // ✅ Update name
            if (name.trim() && name.trim() !== user?.user_metadata?.display_name) {
                updates.display_name = name.trim();
            }
            // ✅ Upload avatar if provided
            if (avatar) {
                const fileName = `${user.id}-${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from("avatars")
                    .upload(fileName, avatar, { upsert: true });
                if (uploadError)
                    throw uploadError;
                const { data: publicData } = supabase.storage
                    .from("avatars")
                    .getPublicUrl(fileName);
                updates.avatar_url = publicData.publicUrl;
                setAvatarUrl(publicData.publicUrl);
            }
            // ✅ Update metadata if any
            if (Object.keys(updates).length > 0) {
                const { error: metaError } = await supabase.auth.updateUser({
                    data: updates,
                });
                if (metaError)
                    throw metaError;
            }
            // ✅ Update password if entered
            if (password.trim()) {
                const { error: passError } = await supabase.auth.updateUser({
                    password: password.trim(),
                });
                if (passError)
                    throw passError;
            }
            await getUser();
            alert("✅ Profile updated successfully!");
            navigate("/");
        }
        catch (err) {
            alert("❌ Error: " + err.message);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "max-w-md mx-auto mt-10 bg-white p-6 rounded-xl shadow", children: [_jsx("h1", { className: "text-xl font-semibold mb-4 text-center", children: "My Profile" }), _jsxs("div", { className: "flex flex-col items-center gap-3 mb-4", children: [avatarUrl ? (_jsx("img", { src: avatarUrl, alt: "Avatar", className: "w-24 h-24 rounded-full object-cover border" })) : (_jsx("div", { className: "w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500", children: "No Photo" })), _jsx("input", { type: "file", accept: "image/*", onChange: (e) => setAvatar(e.target.files?.[0] || null) })] }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("label", { className: "text-sm text-gray-600", children: "Email" }), _jsx("input", { type: "text", value: user?.email || "", disabled: true, className: "border px-3 py-2 rounded bg-gray-100 text-gray-500" }), _jsx("label", { className: "text-sm text-gray-600", children: "Display Name" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "Enter your name", className: "border px-3 py-2 rounded" }), _jsx("label", { className: "text-sm text-gray-600", children: "New Password" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Leave blank to keep current", className: "border px-3 py-2 rounded" }), _jsx("button", { onClick: handleSave, disabled: saving, className: "bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition mt-4", children: saving ? "Saving..." : "Save Changes" }), _jsx("button", { onClick: () => navigate("/"), className: "text-sm text-gray-500 mt-2 underline", children: "\u2190 Back to Moments" })] })] }));
}
