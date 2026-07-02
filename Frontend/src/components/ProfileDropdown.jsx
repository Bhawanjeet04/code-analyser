// Frontend/src/components/ProfileDropdown.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProfileDropdown({ onLogout }) {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // 🚀 FIXED: Use React State to hold the profile data so it can update instantly
  const [username, setUsername] = useState(localStorage.getItem('moora_username') || "User");
  const [avatar, setAvatar] = useState(localStorage.getItem('moora_avatar') || "");

  // 🚀 FIXED: Listen for our custom 'profileUpdated' event triggered by SettingsView
  useEffect(() => {
    const handleProfileUpdate = () => {
      setUsername(localStorage.getItem('moora_username') || "User");
      setAvatar(localStorage.getItem('moora_avatar') || "");
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  // Compute profile badge (Emoji vs Initial fallback character)
  const profileDisplayBadge = avatar ? avatar : username.charAt(0).toUpperCase();

  return (
    <div 
      className="relative z-50"
      onMouseEnter={() => setShowProfileMenu(true)}
      onMouseLeave={() => setShowProfileMenu(false)}
    >
      {/* Profile Circle Avatar Badge */}
      <div
        onClick={() => navigate("/dashboard")}
        className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] text-white text-sm font-extrabold flex items-center justify-center border-2 border-white/20 shadow-2xl scale-100 hover:scale-105 transition-all select-none duration-150 cursor-pointer"
      >
        {profileDisplayBadge}
      </div>

      {/* Dropdown Menu Overlay */}
      {showProfileMenu && (
        <div className="absolute right-0 top-full pt-2 w-52 animate-fadeIn">
          <div className="bg-[#11111a] border border-[#1e1e2f] rounded-xl shadow-2xl overflow-hidden py-1.5">
            
            <div className="px-4 py-2.5 border-b border-white/[0.04]">
              <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Account Identity</p>
              <p className="text-xs text-white truncate mt-0.5 font-bold font-mono tracking-wide">{username}</p>
            </div>
            
            <button 
              onClick={() => navigate('/settings')}
              className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer font-medium flex items-center gap-2"
            >
              ⚙️ Preferences & Settings
            </button>
            
            <div className="h-[1px] bg-white/[0.04] my-1" />
            
            <button 
              onClick={onLogout}
              className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-all cursor-pointer font-bold flex items-center gap-2"
            >
              🚪 Sign Out Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}