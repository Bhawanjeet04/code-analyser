// Frontend/src/views/AuthView.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // 1. Add this import
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AuthView({ mode = "login", onAuthSuccess }) {
  const navigate = useNavigate(); // 2. Initialize the navigation hook
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsLogin(mode !== "signup");
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      onAuthSuccess?.(data.userId || data.user?.id);
    } catch (err) {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFederation = () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a10] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* 3. Update this button to navigate back to the root route directly */}
        <button
          onClick={() => navigate("/")}
          className="mb-6 text-sm text-slate-500 hover:text-slate-300 transition-colors font-medium cursor-pointer"
        >
          ← Back to home
        </button>

        <Card className="p-8 border border-slate-800/80 bg-[#12111f] rounded-xl shadow-2xl">
          <h1 className="text-2xl font-semibold text-white mb-1">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            {isLogin
              ? "Log in to keep collaborating on your code."
              : "Start writing code together in minutes."}
          </p>

          <button
            type="button"
            onClick={handleGoogleFederation}
            className="w-full flex items-center justify-center gap-3 h-11 border border-slate-700/60 rounded-lg text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 transition-all cursor-pointer mb-5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2A5.64 5.64 0 0 1 8.36 13c0-3.11 2.522-5.63 5.63-5.63c1.397 0 2.673.513 3.657 1.358l3.08-3.08C18.823 3.93 16.545 3 13.99 3C8.472 3 4 7.472 4 12.99c0 5.517 4.472 9.99 9.99 9.99c5.772 0 9.99-4.067 9.99-9.99c0-.68-.08-1.3-.23-1.705H12.24Z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center my-5 opacity-30">
            <div className="flex-1 h-[1px] bg-slate-600" />
            <span className="text-[10px] tracking-wider uppercase font-bold px-3 text-slate-400">OR</span>
            <div className="flex-1 h-[1px] bg-slate-600" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="!bg-[#19182b] !border-slate-800 text-sm h-10 rounded-lg"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="!bg-[#19182b] !border-slate-800 text-sm h-10 rounded-lg"
            />

            {error && (
              <p className="text-red-400 text-xs font-light bg-red-500/10 border border-red-500/10 rounded p-2.5 mt-1">
                {error}
              </p>
            )}

            <div className="mt-2">
              <Button type="submit" variant="primary" disabled={loading} className="w-full h-10 font-bold text-xs uppercase tracking-wider">
                {loading ? "Please wait…" : isLogin ? "Log in" : "Sign up"}
              </Button>
            </div>
          </form>

          <p className="text-sm text-slate-400 mt-6 text-center">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setError("");
                setIsLogin((v) => !v);
              }}
              className="text-[#c4b5fd] font-medium hover:underline cursor-pointer ml-1"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}