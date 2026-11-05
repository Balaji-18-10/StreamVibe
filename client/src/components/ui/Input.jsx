import React, { forwardRef } from 'react';
import { X } from 'lucide-react';

const Input = forwardRef(
  (
    {
      label,
      error,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      onClear,
      value,
      className = '',
      wrapperClassName = '',
      type = 'text',
      disabled = false,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`w-full flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label && (
          <label className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {LeftIcon && (
            <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
              <LeftIcon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            type={type}
            value={value}
            disabled={disabled}
            className={`w-full bg-[#17171D] border text-white placeholder-zinc-500 text-sm rounded-xl py-2.5 transition-all duration-200 outline-none ${
              LeftIcon ? 'pl-10' : 'pl-4'
            } ${RightIcon || onClear ? 'pr-10' : 'pr-4'} ${
              error
                ? 'border-red-500/70 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
                : 'border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038]'
            } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {onClear && value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!onClear && RightIcon && (
            <div className="absolute right-3.5 text-zinc-400 pointer-events-none">
              <RightIcon className="w-4 h-4" />
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
