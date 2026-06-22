import React, { useState } from 'react';
import AuthView from '../views/AuthView';

export default function AppRoutes() {
  const [userSession, setUserSession] = useState(null);

  const handleAuthSuccess = (userId) => {
    setUserSession(userId);
  };

  if (!userSession) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  // Placeholder representing the next view layer module (Dashboard/Workspace View)
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <h2 className="text-xl font-sohne text-stripe-text">Authenticated Workspace View (Phase 2 Component Target)</h2>
    </div>
  );
}