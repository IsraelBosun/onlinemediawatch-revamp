import React from 'react';

export const Input = ({ type = 'text', placeholder, value, onChange, className = '' }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all duration-200 text-sm ${className}`}
  />
);

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm ${className}`}>
    {children}
  </div>
);

export const Tab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap
      ${active
        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
  >
    {children}
  </button>
);

export const Button = ({ onClick, disabled, variant = 'primary', children, className = '', type = 'button' }) => {
  const base = "py-2.5 px-5 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98]";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 focus:ring-blue-500",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 focus:ring-emerald-500",
    outline: "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-slate-400",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const getSentimentColor = (score) => {
  if (score > 0) return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/50';
  if (score < 0) return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700/50';
  return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/50';
};

export const StatCard = ({ label, value, percentage, colorClass }) => (
  <div className={`p-5 rounded-2xl border ${colorClass} animate-fade-in`}>
    <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">{label}</p>
    <p className="text-3xl font-black">{value}</p>
    {percentage !== undefined && (
      <p className="text-xs opacity-50 mt-1 font-medium">{percentage}% of total</p>
    )}
  </div>
);

export const SkeletonCard = () => (
  <div className="p-5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
    <div className="flex justify-between">
      <div className="h-5 w-20 skeleton rounded-full" />
      <div className="h-5 w-24 skeleton rounded-full" />
    </div>
    <div className="h-5 w-full skeleton rounded-lg" />
    <div className="h-5 w-3/4 skeleton rounded-lg" />
    <div className="space-y-2 pt-1">
      <div className="h-3 w-full skeleton rounded" />
      <div className="h-3 w-5/6 skeleton rounded" />
      <div className="h-3 w-4/5 skeleton rounded" />
    </div>
  </div>
);
