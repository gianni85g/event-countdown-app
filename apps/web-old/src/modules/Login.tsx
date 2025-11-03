import { useState, useEffect } from "react";
import { useAuthStore } from "@moments/shared";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { signIn, signUp, signOut, loading, user, error } = useAuthStore();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // ✅ Automatically redirect when user is set (only on successful auth, no errors)
  useEffect(() => {
    if (user && !loading && !error) {
      navigate("/");
    }
  }, [user, loading, error, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear any previous errors
    if (isLogin) {
      await signIn(email, password);
    } else {
      await signUp(email, password, name);
    }
    // Don't catch errors here - let them display in the UI
  };

  // Show welcome screen if user is already logged in
  if (user) {
    const displayName = user?.user_metadata?.display_name?.trim() || user?.user_metadata?.name?.trim() || user?.email?.split("@")[0] || "User";
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm text-center mx-4 sm:mx-0">
          <h1 className="text-xl font-semibold mb-4 text-gray-800">
            Welcome, {displayName}! 👋
          </h1>
          <button
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition w-full"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 px-4">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm mx-auto">
        <h1 className="text-xl font-semibold mb-4 text-center text-gray-800">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!isLogin && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border border-gray-300 px-3 py-2 rounded text-sm"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-gray-300 px-3 py-2 rounded text-sm w-full"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border border-gray-300 px-3 py-2 rounded text-sm w-full"
          />
          <button
            disabled={loading}
            className="bg-blue-500 text-white py-2 min-h-[44px] rounded hover:bg-blue-600 transition w-full"
          >
            {isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        {error && (
          <p className="text-red-600 text-sm text-center mt-2">
            {error.includes("already registered")
              ? "This email is already registered. Please log in instead."
              : error.includes("Invalid login credentials")
              ? "Invalid credentials. Please try again."
              : error}
          </p>
        )}

        <p className="text-sm text-gray-600 mt-2 text-center">
          <button
            type="button"
            onClick={() => navigate("/reset-password")}
            className="text-blue-600 hover:underline"
          >
            Forgot password?
          </button>
        </p>

        <p className="text-sm text-gray-600 mt-3 text-center">
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => setIsLogin(false)}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setIsLogin(true)}
                className="text-blue-600 hover:underline"
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

