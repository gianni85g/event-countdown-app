import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
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
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Clear any previous errors
        if (isLogin) {
            await signIn(email, password);
        }
        else {
            await signUp(email, password, name);
        }
        // Don't catch errors here - let them display in the UI
    };
    // Show welcome screen if user is already logged in
    if (user) {
        const displayName = user?.user_metadata?.display_name?.trim() || user?.user_metadata?.name?.trim() || user?.email?.split("@")[0] || "User";
        return (_jsx("div", { className: "flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-purple-100", children: _jsxs("div", { className: "bg-white p-6 rounded-xl shadow-md w-full max-w-sm text-center mx-4 sm:mx-0", children: [_jsxs("h1", { className: "text-xl font-semibold mb-4 text-gray-800", children: ["Welcome, ", displayName, "! \uD83D\uDC4B"] }), _jsx("button", { onClick: async () => {
                            await signOut();
                            navigate("/login");
                        }, className: "bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition w-full", children: "Logout" })] }) }));
    }
    return (_jsx("div", { className: "flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 px-4", children: _jsxs("div", { className: "bg-white p-6 rounded-xl shadow-md w-full max-w-sm mx-auto", children: [_jsx("h1", { className: "text-xl font-semibold mb-4 text-center text-gray-800", children: isLogin ? "Welcome back" : "Create your account" }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-3", children: [!isLogin && (_jsx("input", { type: "text", placeholder: "Your name", value: name, onChange: (e) => setName(e.target.value), required: true, className: "border border-gray-300 px-3 py-2 rounded text-sm" })), _jsx("input", { type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), required: true, className: "border border-gray-300 px-3 py-2 rounded text-sm w-full" }), _jsx("input", { type: "password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value), required: true, className: "border border-gray-300 px-3 py-2 rounded text-sm w-full" }), _jsx("button", { disabled: loading, className: "bg-blue-500 text-white py-2 min-h-[44px] rounded hover:bg-blue-600 transition w-full", children: isLogin ? "Sign In" : "Sign Up" })] }), error && (_jsx("p", { className: "text-red-600 text-sm text-center mt-2", children: error.includes("already registered")
                        ? "This email is already registered. Please log in instead."
                        : error.includes("Invalid login credentials")
                            ? "Invalid credentials. Please try again."
                            : error })), _jsx("p", { className: "text-sm text-gray-600 mt-2 text-center", children: _jsx("button", { type: "button", onClick: () => navigate("/reset-password"), className: "text-blue-600 hover:underline", children: "Forgot password?" }) }), _jsx("p", { className: "text-sm text-gray-600 mt-3 text-center", children: isLogin ? (_jsxs(_Fragment, { children: ["Don't have an account?", " ", _jsx("button", { onClick: () => setIsLogin(false), className: "text-blue-600 hover:underline", children: "Sign up" })] })) : (_jsxs(_Fragment, { children: ["Already have an account?", " ", _jsx("button", { onClick: () => setIsLogin(true), className: "text-blue-600 hover:underline", children: "Log in" })] })) })] }) }));
}
