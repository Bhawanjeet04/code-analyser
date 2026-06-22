import React from 'react';

export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-stripe-border rounded-sm p-8 shadow-sm ${className}`}>
      {children}
    </div>
  );
}