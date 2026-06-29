// Frontend/src/routes/AppRoutes.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingView from '../views/LandingView';
import AuthView from '../views/AuthView';
import DashboardPage from '../views/DashboardPage';

export default function AppRoutes() {
  const [userSession, setUserSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. On page refresh, check if a valid session node exists
    const savedSession = localStorage.getItem('moora_session_id');
    if (savedSession) {
      setUserSession(savedSession);
    }
    setAuthLoading(false);
  }, []);

  const handleAuthSuccess = (userId) => {
    // 2. Persist session so refreshes don't break the app
    localStorage.setItem('moora_session_id', userId);
    setUserSession(userId);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('moora_session_id');
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
      {/* Public Landing Marketing Route */}
      <Route path="/" element={<LandingView onNavigate={(mode) => navigate(`/${mode}`)} />} />

      {/* Structured Authentication Pipelines */}
      <Route 
        path="/login" 
        element={userSession ? <Navigate to="/dashboard" replace /> : <AuthView mode="login" onAuthSuccess={handleAuthSuccess} />} 
      />
      <Route 
        path="/signup" 
        element={userSession ? <Navigate to="/dashboard" replace /> : <AuthView mode="signup" onAuthSuccess={handleAuthSuccess} />} 
      />

      {/* Protected Production Workspaces */}
      <Route 
        path="/dashboard" 
        element={userSession ? <DashboardPage userSession={userSession} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
      />

      {/* Dynamic Collaborative Rooms Routing Node */}
      <Route 
        path="/room/:roomId" 
        element={userSession ? <DashboardPage userSession={userSession} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
      />

      {/* Fallback Safety Anchor */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}