import React from 'react';
import Button from './Button.jsx';
import { Film } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Film,
  title = 'No content found',
  description = 'There is currently nothing to show here. Try exploring trending videos or checking back later.',
  actionLabel,
  onAction,
  actionTo,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 max-w-md mx-auto rounded-3xl bg-[#17171D]/40 border border-[#23232C]/60 backdrop-blur-sm ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-[#17171D] border border-white/5 flex items-center justify-center text-[#FF3038] mb-5 shadow-inner">
        <Icon className="w-8 h-8 stroke-[1.75]" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#A1A1AA] leading-relaxed mb-6">{description}</p>
      {(actionLabel && (onAction || actionTo)) && (
        <Button
          variant="primary"
          size="md"
          to={actionTo}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
