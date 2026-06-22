import React from 'react';

export default function Button({ children, variant = 'primary', ...props }) {
  const baseStyles = "h-12 px-6 rounded-sm font-sohne font-medium text-sm transition-all flex items-center justify-center tracking-wide focus:outline-none";
  
  const variants = {
    primary: "bg-stripe-primary text-white hover:bg-[#4330E6]",
    secondary: "bg-white text-stripe-primary border border-stripe-border hover:bg-slate-50",
    link: "bg-transparent text-stripe-primary p-0 h-auto font-normal"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}