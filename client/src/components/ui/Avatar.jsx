import React, { useState } from 'react';

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const indicatorSizeMap = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

export default function Avatar({
  src,
  alt = 'User avatar',
  name = '',
  size = 'md',
  isOnline = false,
  className = '',
  border = false,
}) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (text) => {
    if (!text) return '?';
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  const computedSize = sizeMap[size] || sizeMap.md;
  const indicatorSize = indicatorSizeMap[size] || indicatorSizeMap.md;

  return (
    <div className={`relative inline-block shrink-0 ${computedSize} ${className}`}>
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover rounded-full ${
            border ? 'ring-2 ring-[#FF3038]/40 ring-offset-2 ring-offset-[#0B0B0F]' : ''
          }`}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full bg-gradient-to-tr from-[#17171D] to-[#272732] border border-white/10 flex items-center justify-center font-bold text-white uppercase select-none ${
            border ? 'ring-2 ring-[#FF3038]/40 ring-offset-2 ring-offset-[#0B0B0F]' : ''
          }`}
        >
          {getInitials(name || alt)}
        </div>
      )}
      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-[#0B0B0F] ${indicatorSize}`}
        />
      )}
    </div>
  );
}
