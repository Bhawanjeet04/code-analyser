// Frontend/src/views/AuthView.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { FcGoogle } from "react-icons/fc";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AuthView({ mode = "login", onAuthSuccess }) {
  const navigate = useNavigate(); 
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
        <button
          onClick={() => navigate("/")}
          className="mb-6 text-sm text-slate-400 hover:text-slate-300 transition-colors font-medium cursor-pointer"
        >
          ← Back to home
        </button>

        <Card className="p-8 border border-slate-200 bg-white rounded-xl shadow-2xl">
          <h1 className="text-2xl font-semibold text-slate-900 mb-4">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>


          <button type="button" onClick={handleGoogleFederation}
            className="w-full flex items-center justify-center gap-3 h-11 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer mb-5"
          >
            <FcGoogle className="text-xl" />
            Continue with Google
          </button>

          <div className="flex items-center my-5 opacity-60">
            <div className="flex-1 h-[1px] bg-slate-300" />
            <span className="text-[10px] tracking-wider uppercase font-bold px-3 text-slate-400">OR</span>
            <div className="flex-1 h-[1px] bg-slate-300" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="!bg-slate-50 !border-slate-300 !text-slate-900 text-sm h-10 rounded-lg pl-2"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="!bg-slate-50 !border-slate-300 !text-slate-900 text-sm h-10 rounded-lg pl-2"
            />

            {error && (
              <p className="text-red-600 text-xs font-light bg-red-50 border border-red-200 rounded p-2.5 mt-1">
                {error}
              </p>
            )}

            <div className="mt-2">
              <Button type="submit" variant="primary" disabled={loading} className="w-full h-10 font-bold text-xs uppercase tracking-wider bg-black rounded-xl text-white">
                {loading ? "Please wait…" : isLogin ? "Log in" : "Sign up"}
              </Button>
            </div>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setError("");
                setIsLogin((v) => !v);
              }}
              className="text-black font-medium hover:underline cursor-pointer ml-1"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}