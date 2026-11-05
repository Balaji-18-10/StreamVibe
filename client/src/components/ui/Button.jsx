import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-[#FF3038] hover:bg-[#E0222A] text-white font-semibold shadow-lg shadow-[#FF3038]/20 active:scale-[0.98]',
  secondary:
    'bg-[#17171D] hover:bg-[#202027] text-white font-medium border border-[#23232C] active:scale-[0.98]',
  outline:
    'border border-[#23232C] hover:border-[#33333F] text-zinc-300 hover:text-white hover:bg-white/5 active:scale-[0.98]',
  ghost:
    'text-zinc-400 hover:text-white hover:bg-white/10 active:scale-[0.98]',
  icon:
    'p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-transform',
  danger:
    'bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-600/20 active:scale-[0.98]',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
  sm: 'px-3.5 py-1.5 text-xs rounded-xl gap-2',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-2xl gap-2.5',
  icon: 'p-2 rounded-full',
};

const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      to,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isIconButton = variant === 'icon';
    const computedSize = isIconButton ? sizes.icon : sizes[size] || sizes.md;
    const computedVariant = variants[variant] || variants.primary;

    const baseClasses =
      'inline-flex items-center justify-center transition-all duration-200 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
    const fullClass = `${baseClasses} ${computedVariant} ${computedSize} ${className}`;

    const content = (
      <>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          LeftIcon && <LeftIcon className="w-4 h-4 shrink-0" />
        )}
        {children && <span>{children}</span>}
        {!isLoading && RightIcon && <RightIcon className="w-4 h-4 shrink-0" />}
      </>
    );

    if (to) {
      return (
        <Link to={to} className={fullClass} ref={ref} {...props}>
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={fullClass}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
