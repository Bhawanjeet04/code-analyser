// Frontend/src/views/SettingsView.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SettingsView({ userSession, onLogout }) {
  const navigate = useNavigate();

  // Settings State Managers
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // 🚀 FIXED: Initialize state straight from local cache values to persist selected view metrics
  const [selectedAvatar, setSelectedAvatar] = useState(localStorage.getItem('moora_avatar') || "");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsMessageError] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const savedUserNameRaw = localStorage.getItem('moora_username') || "User";
  
  // 🚀 FIXED: Compute dynamic representation badge (Emoji vs Initial fallback character)
  const profileDisplayBadge = selectedAvatar ? selectedAvatar : savedUserNameRaw.charAt(0).toUpperCase();

  const handleUpdatePasswordSubmit = async (e) => {
    e.preventDefault();
    setSettingsMessage("");
    setSettingsMessageError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/update-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userSession, currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password patch failure.");
      setSettingsMessage("✨ Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setSettingsMessageError(err.message);
    }
  };

    const handleUpdateAvatarSubmit = async (avatarUrl) => {
        setSettingsMessage("");
        setSettingsMessageError("");
        try {
        const res = await fetch(`${API_BASE}/api/auth/update-avatar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userSession, avatar: avatarUrl })
        });
        if (!res.ok) throw new Error("Avatar patch failed.");
        
        setSelectedAvatar(avatarUrl);
        localStorage.setItem('moora_avatar', avatarUrl);
        
        // 🚀 FIXED: Tell every component in the app to re-read from localStorage!
        window.dispatchEvent(new Event('profileUpdated'));
        
        setSettingsMessage("👤 Avatar style sync updated!");
        } catch (err) {
        setSettingsMessageError(err.message);
        }
    };


  const handleDeleteUserAccount = async () => {
    const confirmVerification = window.confirm("⚠️ WARNING: Deleting your account is permanent! This will wipe your profile and all cloud files completely. Proceed?");
    if (!confirmVerification) return;

    try {
      const res = await fetch(`${API_BASE}/api/auth/delete-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userSession })
      });
      if (!res.ok) throw new Error("Account deletion rejected.");
      onLogout();
    } catch (err) {
      alert(`Deletion failure: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#09090e] text-[#C9D1D9] font-sans antialiased flex flex-col p-6 overflow-x-hidden">
      
      {/* Configuration Nav Bar Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6 border-b border-[#1f1f35] mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/")}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            ← Back to Home
          </button>
          <h1 className="text-xl font-bold tracking-tight text-white font-sohne">Account Preferences</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* 🚀 FIXED: Swapped static character lookup with dynamic {profileDisplayBadge} output */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] text-white text-base font-extrabold flex items-center justify-center border border-white/10 shadow-md select-none">
            {profileDisplayBadge}
          </div>
          <span className="text-xs font-mono text-slate-400 font-semibold">{savedUserNameRaw}</span>
        </div>
      </header>

      {/* Core Setup Layout Panel */}
      <main className="max-w-2xl mx-auto w-full space-y-6 flex-1">
        
        {/* State Banner Notices */}
        {settingsMessage && <p className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl p-4 font-medium animate-fadeIn">{settingsMessage}</p>}
        {settingsError && <p className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-4 font-medium animate-fadeIn">{settingsError}</p>}

        {/* Option Group 1: Identity Icon Accents */}
        <section className="bg-[#0c0c14] border border-[#1b1b2f] rounded-2xl p-6 space-y-4 shadow-xl">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">1. Select Identity Avatar Accent</h3>
            <p className="text-xs text-slate-500 mt-1">Select an identity emblem to map directly onto your user workspace profiles.</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {['🔥', '💻', '⚡', '🚀', '🛠️', '🧬', '🛡️', '👑'].map((iconEmoji) => (
              <button
                key={iconEmoji}
                onClick={() => handleUpdateAvatarSubmit(iconEmoji)}
                className={`h-12 text-lg rounded-xl flex items-center justify-center border transition-all hover:scale-105 cursor-pointer ${
                  selectedAvatar === iconEmoji 
                    ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/10' 
                    : 'border-slate-800 bg-[#151426] text-white hover:border-slate-600'
                }`}
              >
                {iconEmoji}
              </button> 
            ))}
          </div>
        </section>

        {/* Option Group 2: Password Modifiers */}
        <section className="bg-[#0c0c14] border border-[#1b1b2f] rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">2. Modify Secret Password Security Key</h3>
              <p className="text-xs text-slate-500 mt-1">Change your current workspace passphrase credentials to control user access gates.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Current Password</span>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full bg-[#151426] border border-slate-800 rounded-xl h-11 px-3 text-xs focus:outline-none focus:border-purple-500 text-white transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">New Password Key</span>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-[#151426] border border-slate-800 rounded-xl h-11 px-3 text-xs focus:outline-none focus:border-purple-500 text-white transition-colors"
                />
              </div>
            </div>
            <button type="submit" className="h-10 px-5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md uppercase tracking-wider">
              Update Password Key
            </button>
          </form>
        </section>

        {/* Option Group 3: Danger Zone Eradication */}
        <section className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 space-y-3 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">3. Danger Isolation Zone</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Clicking this completely drops your username from MongoDB, clearing your user metadata collections and code snapshots permanently.
          </p>
          <button 
            onClick={handleDeleteUserAccount}
            type="button" 
            className="h-10 px-5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-colors cursor-pointer uppercase tracking-wider mt-1"
          >
            Delete Profile Node Permanently
          </button>
        </section>

      </main>
    </div>
  );
}