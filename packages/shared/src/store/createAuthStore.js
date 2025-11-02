import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../lib/supabase";
// Check if Supabase is configured by checking environment variables
const isSupabaseConfigured = () => {
    if (typeof import.meta !== "undefined" && import.meta.env) {
        return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    }
    return false;
};
export const useAuthStore = create()(persist((set, get) => ({
    user: null,
    loading: false,
    error: null,
    initialized: false,
    signIn: async (email, password) => {
        set({ loading: true, error: null });
        if (!isSupabaseConfigured() || !supabase) {
            // Mock mode for testing
            console.log('🔧 Using MOCK auth mode (Supabase not configured)');
            set({ user: { id: 'mock-user-1', email }, loading: false, error: null });
            return;
        }
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });
            if (error) {
                set({ loading: false, error: error.message, user: null });
                throw error;
            }
            set({ user: data.user ?? null, loading: false, error: null });
        }
        catch (err) {
            console.error('Auth error:', err);
            set({ loading: false, error: err?.message || "Sign in failed", user: null });
            throw err;
        }
    },
    signUp: async (email, password, name) => {
        set({ loading: true, error: null });
        if (!isSupabaseConfigured() || !supabase) {
            // Mock mode for testing
            console.log('🔧 Using MOCK auth mode (Supabase not configured)');
            set({ user: { id: 'mock-user-1', email, user_metadata: { display_name: name || "" } }, loading: false, error: null });
            return;
        }
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password,
                options: {
                    data: { display_name: name?.trim() || "" },
                },
            });
            if (error) {
                // Map common Supabase errors to user-friendly messages
                let errorMessage = error.message;
                if (error.message.includes("User already registered") ||
                    error.message.includes("already registered") ||
                    error.message.includes("already exists")) {
                    errorMessage = "This email is already registered. Please log in instead.";
                }
                set({ loading: false, error: errorMessage, user: null });
                throw new Error(errorMessage);
            }
            // If no error but also NO session, check if user already exists
            // (Supabase allows duplicate signups with auto-confirm enabled)
            if (!data.session) {
                // Try to sign in to check if user exists
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: email.trim().toLowerCase(),
                    password,
                });
                // User exists (whether password matches or not)
                if (signInError?.message.includes("Invalid login credentials") || !signInError) {
                    // Sign out the user we just tried to sign in
                    await supabase.auth.signOut();
                    set({ loading: false, error: "This email is already registered. Please log in instead.", user: null });
                    throw new Error("This email is already registered. Please log in instead.");
                }
            }
            // Handle email confirmation settings
            // If confirmations are ON, there may be NO session yet
            const sessionUser = data.session?.user ?? data.user ?? null;
            set({ user: sessionUser, loading: false, error: null });
        }
        catch (err) {
            console.error('Auth error:', err);
            set({ loading: false, error: err?.message || "Sign up failed", user: null });
            throw err;
        }
    },
    signOut: async () => {
        if (!isSupabaseConfigured() || !supabase) {
            // Mock mode for testing
            console.log('🔧 Using MOCK auth mode');
            set({ user: null, error: null });
            // Clear event store cache
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('moments-store');
            }
            return;
        }
        try {
            await supabase.auth.signOut();
            // Clear event store cache
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('moments-store');
            }
            set({ user: null, error: null });
        }
        catch (err) {
            console.error('Sign out error:', err);
            set({ user: null, error: null });
        }
    },
    getUser: async () => {
        if (!isSupabaseConfigured() || !supabase) {
            // Mock mode - return null unless previously set
            const state = useAuthStore.getState();
            set({ user: state.user, error: null });
            return;
        }
        try {
            const { data } = await supabase.auth.getUser();
            set({ user: data?.user ?? null, error: null });
        }
        catch (err) {
            console.error('Get user error:', err);
            set({ user: null, error: null });
        }
    },
    initAuth: async () => {
        if (!supabase)
            return;
        try {
            const { data: { session }, } = await supabase.auth.getSession();
            const user = session?.user ?? null;
            set({ user, initialized: true, error: null });
            supabase.auth.onAuthStateChange((_event, session) => {
                set({ user: session?.user ?? null });
            });
        }
        catch (err) {
            console.error('Init auth error:', err);
        }
    },
}), { name: "auth-storage" }));
