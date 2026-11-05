import React from 'react';

export default function Skeleton({
  className = '',
  rounded = 'rounded-xl',
  style,
}) {
  return (
    <div
      style={style}
      className={`animate-pulse bg-[#17171D] border border-white/5 ${rounded} ${className}`}
    />
  );
}
