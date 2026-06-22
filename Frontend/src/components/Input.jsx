import React from 'react';

export default function Input({ label, error, ...props }) {
  return (
    <div className="w-full flex flex-col">
      {label && <label className="block text-sm font-medium text-stripe-text mb-1.5">{label}</label>}
      <input 
        className="w-full bg-white text-stripe-text border border-stripe-border rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-stripe-primary transition-colors placeholder:text-stripe-muted"
        {...props}
      />
      {error && <span className="text-stripe-error text-xs mt-1 font-light">{error}</span>}
    </div>
  );
}