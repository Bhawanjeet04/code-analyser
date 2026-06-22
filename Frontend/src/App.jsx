import React from 'react';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <div className="antialiased selection:bg-stripe-soft selection:text-stripe-primary">
      <AppRoutes />
    </div>
  );
}

export default App;