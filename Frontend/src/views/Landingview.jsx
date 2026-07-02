// Frontend/src/views/LandingView.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCode } from "react-icons/fa6";

const NAV_LINKS = [];
const CODE_TABS = ["Hello.cpp"];

const CODE_LINES = [
  { num: 1, content: <span className="text-slate-400">// Imports</span> },
  {
    num: 2,
    content: (
      <>
        <span className="text-purple-400">import</span>{" "}
        <span className="text-slate-200">mongoose,</span>{" "}
        <span className="text-slate-400">{"{ "}</span>
        <span className="text-yellow-300">Schema</span>
        <span className="text-slate-400">{" }"}</span>{" "}
        <span className="text-purple-400">from</span>{" "}
        <span className="text-green-400">'mongoose'</span>
      </>
    ),
    cursor: "mike",
  },
  { num: 3, content: null },
  { num: 4, content: <span className="text-slate-400">// Collection name</span> },
  {
    num: 5,
    content: (
      <>
        <span className="text-purple-400">export</span>{" "}
        <span className="text-purple-400">const</span>{" "}
        <span className="text-blue-300">collection</span>{" "}
        <span className="text-slate-400">=</span>{" "}
        <span className="text-green-400">'Product'</span>
        <span className="text-slate-200">|</span>
      </>
    ),
  },
  { num: 6, content: null },
  {
    num: 7,
    content: <span className="text-slate-400">// Schema</span>,
    cursor: "rob",
  },
];

function GridBackground() {
  return (
    <div
      className="absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    />
  );
}

function Cursor({ label, color }) {
  const colors = {
    mike: { bg: "bg-indigo-400", text: "text-indigo-900" },
    rob: { bg: "bg-amber-300", text: "text-amber-900" },
  };
  const c = colors[color];
  return (
    <span className="relative inline-flex items-center ml-1 align-middle">
      <span
        className="inline-block w-0.5 h-4 rounded-sm animate-pulse"
        style={{ background: color === "mike" ? "#818cf8" : "#fcd34d" }}
      />
      <span
        className={`absolute left-2 -top-7 ${c.bg} ${c.text} text-xs font-semibold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap`}
      >
        {label}
      </span>
    </span>
  );
}

export default function LandingView({ userSession, onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // 🚀 FIXED: Now pulling BOTH the username and the avatar emoji from local storage!
  const savedUserNameRaw = localStorage.getItem('moora_username') || "User";
  const savedAvatarRaw = localStorage.getItem('moora_avatar') || "";

  // 🚀 FIXED: Dynamic Badge Logic - Shows the emoji if it exists, otherwise falls back to the first letter
  const profileDisplayBadge = savedAvatarRaw ? savedAvatarRaw : savedUserNameRaw.charAt(0).toUpperCase();

  const handleWorkspaceActionRedirect = () => {
    if (userSession) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden font-sans relative"
      style={{
        background: "linear-gradient(160deg, #0f0f18 0%, #13111f 60%, #1a1430 100%)",
      }}
    >
      <div className="h-full w-full flex flex-col p-3 overflow-hidden">
        <div
          className="flex-1 rounded-2xl flex flex-col overflow-hidden relative"
          style={{
            boxShadow: "0 0 0 1px rgba(140,120,255,0.18), 0 0 60px 10px rgba(120,100,255,0.08)",
            background: "linear-gradient(160deg, #0f0f1a 0%, #110f1e 100%)",
          }}
        >
          {/* NAV BAR */}
          <nav className="flex items-center justify-between px-8 py-4 relative z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <FaCode className="text-xl text-[#8B5CF6]" />
              <span className="text-white text-xl font-semibold tracking-tight">CoderHub</span>
            </div>

            {userSession ? (
              <div 
                className="relative z-30"
                onMouseEnter={() => setShowProfileMenu(true)}
                onMouseLeave={() => setShowProfileMenu(false)}
              >
                {/* 🚀 FIXED: Changed {userInitialBadge} to {profileDisplayBadge} inside the circle */}
                <div
                  onClick={() => navigate("/")}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] text-white text-sm font-extrabold flex items-center justify-center border-2 border-white/20 shadow-2xl scale-100 hover:scale-105 transition-all select-none duration-150 cursor-pointer"
                >
                  {profileDisplayBadge}
                </div>

                {/* Dropdown Menu Overlay */}
                {showProfileMenu && (
                  <div className="absolute right-0 top-full pt-2 w-48 animate-fadeIn">
                    <div className="bg-[#11111a] border border-[#1e1e2f] rounded-xl shadow-2xl overflow-hidden py-1.5">
                      <div className="px-4 py-2 border-b border-white/[0.04]">
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Authenticated User</p>
                        <p className="text-xs text-white truncate mt-0.5 font-semibold font-mono">{savedUserNameRaw}</p>
                      </div>
                      
                      <button 
                        onClick={() => navigate('/settings')}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer font-medium flex items-center gap-2"
                      >
                        ⚙️ Preferences & Settings
                      </button>
                      
                      <div className="h-[1px] bg-white/[0.04] my-1" />
                      
                      <button 
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer font-semibold flex items-center gap-2"
                      >
                        Log Out Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="border border-slate-600 hover:border-slate-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-all duration-200 hover:bg-white/5 cursor-pointer"
              >
                Log in
              </button>
            )}
          </nav>

          {/* MAIN HERO VIEWPORT */}
          <main className="relative flex-1 flex flex-col items-center justify-center px-6 pb-0 overflow-hidden">
            <GridBackground />

            <div className="relative z-10 text-center max-w-3xl mx-auto w-full flex flex-col items-center">
              <h1 className="text-5xl md:text-6xl font-light leading-[1.08] tracking-tight mb-4">
                <span style={{ color: "#e8d5a3" }}>Great code </span>
                <span style={{
                  background: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #8b7cf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>comes</span>
                <br />
                <span style={{ color: "#e8d5a3" }}>from </span>
                <span style={{
                  background: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #8b7cf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>teamwork.</span>
              </h1>

              <p className="text-slate-400 text-base leading-relaxed mb-7 max-w-xl mx-auto">
                Work together to write clean, efficient, and reliable code.<br />
                Solve challenges faster and smarter through collaboration.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                <button
                  onClick={handleWorkspaceActionRedirect}
                  className="px-7 py-2.5 rounded-lg font-semibold text-sm text-slate-900 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                  style={{ background: "#e8d5a3" }}
                >
                  Go To Code Editor
                </button>
                <button
                  onClick={handleWorkspaceActionRedirect}
                  className="px-7 py-2.5 rounded-lg font-semibold text-sm text-white border border-slate-600 hover:border-slate-400 hover:bg-white/5 transition-all duration-200 cursor-pointer"
                >
                  Collaborator
                </button>
              </div>

              {/* MOCK IDE VIEWPORT FRAME */}
              <div
                className="relative w-full max-w-2xl mx-auto rounded-xl text-left overflow-hidden"
                style={{
                  background: "#111118",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 0 0 1px rgba(140,120,255,0.1), 0 24px 60px rgba(0,0,0,0.6)",
                }}
              >
                <div className="flex items-center px-3 pt-2 gap-1 border-b border-white/[0.06] shrink-0" style={{ background: "#0d0d14" }}>
                  {CODE_TABS.map((tab, i) => (
                    <button key={tab} onClick={() => setActiveTab(i)} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors ${activeTab === i ? "bg-[#111118] text-slate-200 border-t border-x border-white/[0.08]" : "text-slate-500 hover:text-slate-300"}`}>
                      📄 {tab}
                    </button>
                  ))}
                </div>

                <div className="pt-3 pb-0 px-2 font-mono text-sm leading-7 select-none">
                  {CODE_LINES.map((line) => (
                    <div key={line.num} className="flex items-center group">
                      <span className="w-10 text-right text-slate-600 text-xs pr-4 shrink-0">{line.num}</span>
                      <span className="flex-1 text-slate-300 whitespace-nowrap">
                        {line.content}
                        {line.cursor === "mike" && <Cursor label="Mike" color="mike" />}
                        {line.cursor === "rob" && <Cursor label="Rob" color="rob" />}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="h-14 w-full" style={{ background: "linear-gradient(to bottom, transparent, #111118)" }} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}