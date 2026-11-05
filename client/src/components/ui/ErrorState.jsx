import React from 'react';
import Button from './Button.jsx';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this page. Please try again.',
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 max-w-md mx-auto rounded-3xl bg-[#17171D]/40 border border-red-500/20 backdrop-blur-sm ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-5 shadow-lg shadow-red-500/5">
        <AlertCircle className="w-8 h-8 stroke-[1.75]" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#A1A1AA] leading-relaxed mb-6">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="md"
          leftIcon={RefreshCw}
          onClick={onRetry}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
