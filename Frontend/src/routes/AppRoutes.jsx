// Frontend/src/routes/AppRoutes.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingView from '../views/LandingView';
import AuthView from '../views/AuthView';
import DashboardPage from '../views/DashboardPage';
import SettingsView from '../views/SettingsView'; // 🚀 IMPORTED: Clean Settings Page View
import LiveRoom from '../views/Liveroom';

export default function AppRoutes() {
  const [userSession, setUserSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedSession = localStorage.getItem('moora_session_id');
    if (savedSession) {
      setUserSession(savedSession);
    }
    setAuthLoading(false);
  }, []);

  const handleAuthSuccess = (userId) => {
    localStorage.setItem('moora_session_id', userId);
    setUserSession(userId);
    navigate('/', { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('moora_session_id');
    localStorage.removeItem('moora_username');
    localStorage.removeItem('moora_avatar'); // 🚀 Wipes out cached avatar tracking string on session exit
    setUserSession(null);
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a10] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Home Landing View Contract */}
      <Route path="/" element={<LandingView userSession={userSession} onLogout={handleLogout} />} />

      {/* Structured Authentication Pipelines */}
      <Route 
        path="/login" 
        element={<AuthView mode="login" onAuthSuccess={handleAuthSuccess} />} 
      />
      <Route 
        path="/signup" 
        element={<AuthView mode="signup" onAuthSuccess={handleAuthSuccess} />} 
      />

      <Route 
        path="/live/:roomId" 
        element={userSession ? <LiveRoom userSession={userSession} /> : <Navigate to="/login" replace />} 
      />

      {/* 🚀 NEW: Dedicated Protected Settings Interface Node Routing Path */}
      <Route 
        path="/settings" 
        element={userSession ? <SettingsView userSession={userSession} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
      />

      {/* Protected Production Workspaces */}
      <Route 
        path="/dashboard" 
        element={userSession ? <DashboardPage userSession={userSession} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
      />

      <Route 
        path="/room/:roomId" 
        element={userSession ? <DashboardPage userSession={userSession} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}