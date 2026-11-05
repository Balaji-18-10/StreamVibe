import React from 'react';

const badgeVariants = {
  default: 'bg-[#23232C] text-zinc-300 border border-white/5',
  accent: 'bg-[#FF3038]/15 text-[#FF3038] border border-[#FF3038]/30 font-semibold',
  live: 'bg-[#FF3038] text-white font-bold tracking-wider uppercase animate-pulse',
  duration: 'bg-black/85 text-white/95 backdrop-blur-sm text-[11px] font-semibold tracking-wide px-1.5 py-0.5 rounded-md shadow-md',
  outline: 'border border-[#23232C] text-zinc-400',
  secondary: 'bg-[#17171D] text-zinc-300 border border-[#23232C]',
};

export default function Badge({
  children,
  variant = 'default',
  className = '',
  icon: Icon,
}) {
  const variantClass = badgeVariants[variant] || badgeVariants.default;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full select-none ${variantClass} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
}
