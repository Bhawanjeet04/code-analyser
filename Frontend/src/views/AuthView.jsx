import { useState } from "react";

const NAV_LINKS = [];
const CODE_TABS = ["Hello.cpp"];

// Only show first 7 lines — cropped, no scroll
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

export default function MooraLanding() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div
      className="h-screen w-screen overflow-hidden font-sans"
      style={{
        background: "linear-gradient(160deg, #0f0f18 0%, #13111f 60%, #1a1430 100%)",
      }}
    >
      <div className="h-full w-full flex flex-col p-3 overflow-hidden">
        <div
          className="flex-1 rounded-2xl flex flex-col overflow-hidden"
          style={{
            boxShadow: "0 0 0 1px rgba(140,120,255,0.18), 0 0 60px 10px rgba(120,100,255,0.08)",
            background: "linear-gradient(160deg, #0f0f1a 0%, #110f1e 100%)",
          }}
        >
          {/* NAV */}
          <nav className="flex items-center justify-between px-8 py-4 relative z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                <rect x="0" y="0" width="6" height="6" rx="1" fill="white" opacity="0.9" />
                <rect x="8" y="0" width="6" height="6" rx="1" fill="white" opacity="0.5" />
                <rect x="0" y="8" width="6" height="6" rx="1" fill="white" opacity="0.5" />
                <rect x="8" y="8" width="6" height="6" rx="1" fill="white" opacity="0.9" />
                <rect x="16" y="0" width="6" height="6" rx="1" fill="white" opacity="0.2" />
                <rect x="16" y="8" width="6" height="6" rx="1" fill="white" opacity="0.2" />
              </svg>
              <span className="text-white text-xl font-semibold tracking-tight">moora</span>
            </div>

            <ul className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <li key={link}>
                  <a href="#" className="text-slate-400 hover:text-white text-sm font-medium transition-colors duration-200">
                    {link}
                  </a>
                </li>
              ))}
            </ul>

            <button className="border border-slate-600 hover:border-slate-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-all duration-200 hover:bg-white/5">
              Log in
            </button>
          </nav>

          {/* HERO */}
          <main className="relative flex-1 flex flex-col items-center justify-center px-6 pb-0 overflow-hidden">
            <GridBackground />

            <div className="relative z-10 text-center max-w-3xl mx-auto w-full flex flex-col items-center">
              {/* Headline */}
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
                <span className="inline-block mx-1 align-middle text-5xl md:text-5xl"></span>
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

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                <button
                  className="px-7 py-2.5 rounded-lg font-semibold text-sm text-slate-900 transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ background: "#e8d5a3" }}
                >
                  Start free trial
                </button>
                <button className="px-7 py-2.5 rounded-lg font-semibold text-sm text-white border border-slate-600 hover:border-slate-400 hover:bg-white/5 transition-all duration-200">
                  Get a demo
                </button>
              </div>

              {/* CODE EDITOR — cropped, no scroll, fades out at bottom */}
              <div
                className="relative w-full max-w-2xl mx-auto rounded-xl text-left overflow-hidden"
                style={{
                  background: "#111118",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 0 0 1px rgba(140,120,255,0.1), 0 24px 60px rgba(0,0,0,0.6)",
                }}
              >
                {/* Tab bar */}
                <div
                  className="flex items-center px-3 pt-2 gap-1 border-b border-white/[0.06] shrink-0"
                  style={{ background: "#0d0d14" }}
                >
                  {CODE_TABS.map((tab, i) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(i)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors duration-150 ${
                        activeTab === i
                          ? "bg-[#111118] text-slate-200 border-t border-x border-white/[0.08]"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {i === 0 && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect width="12" height="12" rx="2" fill="#f97316" opacity="0.8" />
                          <text x="2" y="9" fontSize="7" fill="white" fontWeight="bold">js</text>
                        </svg>
                      )}
                      {i === 1 && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect width="12" height="12" rx="2" fill="#3b82f6" opacity="0.8" />
                          <text x="1.5" y="9" fontSize="6" fill="white" fontWeight="bold">md</text>
                        </svg>
                      )}
                      {i === 2 && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect width="12" height="12" rx="2" fill="#6b7280" opacity="0.8" />
                          <text x="1.5" y="9" fontSize="6" fill="white" fontWeight="bold">gi</text>
                        </svg>
                      )}
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Code lines — no overflow, just cropped */}
                <div className="pt-3 pb-0 px-2 font-mono text-sm leading-7 select-none">
                  {CODE_LINES.map((line) => (
                    <div key={line.num} className="flex items-center group">
                      <span className="w-10 text-right text-slate-600 text-xs pr-4 shrink-0">
                        {line.num}
                      </span>
                      <span className="flex-1 text-slate-300 whitespace-nowrap">
                        {line.content}
                        {line.cursor === "mike" && <Cursor label="Mike" color="mike" />}
                        {line.cursor === "rob" && <Cursor label="Rob" color="rob" />}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Fade-out gradient at bottom — simulates crop */}
                <div
                  className="h-14 w-full"
                  style={{
                    background: "linear-gradient(to bottom, transparent, #111118)",
                  }}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}