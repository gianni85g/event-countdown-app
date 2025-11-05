import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
    const [signupSuccess, setSignupSuccess] = useState(false);
    const [signupEmail, setSignupEmail] = useState("");
    // Derive a real authenticated session indicator
    // If the store exposed session, prefer that; otherwise infer from user.email_confirmed_at
    const session = !!(user && user.email_confirmed_at);
    // ✅ Automatically redirect when user is set (only on successful auth, no errors)
    useEffect(() => {
        // Redirect only when there is a real session (not just a user object)
        if (session && isLogin && !signupSuccess && !loading && !error) {
            navigate("/");
        }
    }, [session, isLogin, signupSuccess, loading, error, navigate]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Clear any previous errors
        if (isLogin) {
            await signIn(email, password);
        }
        else {
            try {
                await signUp(email, password, name);
                // Do NOT wait for a session and do NOT navigate
                setSignupEmail(email.trim().toLowerCase());
                setSignupSuccess(true);
            }
            catch {
                setSignupSuccess(false);
            }
        }
        // Don't catch errors here - let them display in the UI
    };
    // Show verify-email screen immediately after a successful signup
    if (signupSuccess) {
        return (_jsx("div", { className: "flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 px-4", children: _jsxs("div", { className: "bg-white p-6 rounded-xl shadow-md w-full max-w-sm mx-auto text-center", children: [_jsx("h2", { className: "text-xl font-semibold mb-2", children: "Confirm your email" }), _jsxs("p", { className: "text-gray-600 mb-4", children: ["We sent a verification link to ", _jsx("strong", { children: signupEmail }), ".", _jsx("br", {}), "Please check your inbox and verify your account."] }), _jsx("button", { onClick: () => { setSignupSuccess(false); setIsLogin(true); }, className: "mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition", children: "Return to Login" })] }) }));
    }
    // Show welcome screen if user is already logged in
    if (session && isLogin) {
        const displayName = user?.user_metadata?.display_name?.trim() || user?.user_metadata?.name?.trim() || user?.email?.split("@")[0] || "User";
        return (_jsx("div", { className: "flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-purple-100", children: _jsxs("div", { className: "bg-white p-6 rounded-xl shadow-md w-full max-w-sm text-center mx-4 sm:mx-0", children: [_jsxs("h1", { className: "text-xl font-semibold mb-4 text-gray-800", children: ["Welcome, ", displayName, "! \uD83D\uDC4B"] }), _jsx("button", { onClick: async () => {
                            await signOut();
                            navigate("/login");
                        }, className: "bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition w-full", children: "Logout" })] }) }));
    }
    return (_jsx("div", { className: "flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 px-4", children: _jsx("div", { className: "bg-white p-6 rounded-xl shadow-md w-full max-w-sm mx-auto", children: signupSuccess ? (_jsxs("div", { className: "p-6 text-center", children: [_jsx("h2", { className: "text-xl font-semibold mb-2", children: "Confirm your email" }), _jsxs("p", { className: "text-gray-600", children: ["We sent a confirmation link to ", signupEmail, ". Please verify your account, then come back to log in."] })] })) : (_jsxs(_Fragment, { children: [_jsx("h1", { className: "text-xl font-semibold mb-4 text-center text-gray-800", children: isLogin ? "Welcome back" : "Create your account" }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-3", children: [!isLogin && (_jsx("input", { type: "text", placeholder: "Your name", value: name, onChange: (e) => setName(e.target.value), required: true, className: "border border-gray-300 px-3 py-2 rounded text-sm" })), _jsx("input", { type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), required: true, className: "border border-gray-300 px-3 py-2 rounded text-sm w-full" }), _jsx("input", { type: "password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value), required: true, className: "border border-gray-300 px-3 py-2 rounded text-sm w-full" }), _jsx("button", { disabled: loading, className: "bg-blue-500 text-white py-2 min-h-[44px] rounded hover:bg-blue-600 transition w-full", children: isLogin ? "Sign In" : "Sign Up" })] }), error && (_jsx("p", { className: "text-red-600 text-sm text-center mt-2", children: error.includes("already registered")
                            ? "This email is already registered. Please log in instead."
                            : error.includes("Invalid login credentials")
                                ? "Invalid credentials. Please try again."
                                : error })), _jsx("p", { className: "text-sm text-gray-600 mt-2 text-center", children: _jsx("button", { type: "button", onClick: () => navigate("/reset-password"), className: "text-blue-600 hover:underline", children: "Forgot password?" }) }), _jsx("p", { className: "text-sm text-gray-600 mt-3 text-center", children: isLogin ? (_jsxs(_Fragment, { children: ["Don't have an account?", " ", _jsx("button", { onClick: () => setIsLogin(false), className: "text-blue-600 hover:underline", children: "Sign up" })] })) : (_jsxs(_Fragment, { children: ["Already have an account?", " ", _jsx("button", { onClick: () => setIsLogin(true), className: "text-blue-600 hover:underline", children: "Log in" })] })) })] })) }) }));
}
