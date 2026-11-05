import React from 'react';

export default function LoadingSpinner({
  size = 'md',
  className = '',
  label = 'Loading...',
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 ${className}`}>
      <div
        className={`rounded-full animate-spin border-transparent border-t-[#FF3038] border-r-[#FF3038]/50 ${
          sizeClasses[size] || sizeClasses.md
        }`}
        role="status"
        aria-label={label}
      />
      {label && <span className="text-xs text-zinc-400 font-medium">{label}</span>}
    </div>
  );
}
