import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@moments/shared";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"request" | "update">("request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    
    if (!supabase) {
      setError("Password reset is not available in offline mode.");
      return;
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your inbox for the password reset link!");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    
    if (!supabase) {
      setError("Password reset is not available in offline mode.");
      return;
    }
    
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setMessage("Password updated! You can now log in.");
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  // Supabase automatically redirects here after clicking email link
  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStage("update");
      }
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 px-4">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm mx-auto">
        {stage === "request" && (
          <>
            <h1 className="text-xl font-semibold mb-4 text-center text-gray-800">
              Reset your password
            </h1>
            <form onSubmit={handleSendReset} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Your account email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border border-gray-300 px-3 py-2 rounded text-sm w-full"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white py-2 min-h-[44px] rounded hover:bg-blue-600 transition w-full"
              >
                Send reset email
              </button>
            </form>
          </>
        )}

        {stage === "update" && (
          <>
            <h1 className="text-xl font-semibold mb-4 text-center text-gray-800">
              Enter a new password
            </h1>
            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border border-gray-300 px-3 py-2 rounded text-sm w-full"
              />
              <button
                type="submit"
                className="bg-green-500 text-white py-2 min-h-[44px] rounded hover:bg-green-600 transition w-full"
              >
                Update Password
              </button>
            </form>
          </>
        )}

        {message && <p className="text-green-600 text-sm mt-3 text-center">{message}</p>}
        {error && <p className="text-red-600 text-sm mt-3 text-center">{error}</p>}

        <button
          onClick={() => navigate("/login")}
          className="text-sm text-gray-600 mt-4 underline w-full"
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
}

