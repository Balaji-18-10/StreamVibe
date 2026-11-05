import React, { useState } from 'react';
import { Flag, X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { reportService } from '../../services/index.js';

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or commercial advertising', desc: 'Repetitive comments, scams, or misleading links' },
  { id: 'misleading', label: 'Misleading or deceptive information', desc: 'Fabricated claims, false context, or clickbait harm' },
  { id: 'violence', label: 'Violent or dangerous content', desc: 'Graphic violence, dangerous activities, or self-harm incitement' },
  { id: 'harassment', label: 'Harassment or hate speech', desc: 'Targeted attacks, slurs, threats, or intimidation' },
  { id: 'copyright', label: 'Copyright violation', desc: 'Infringes intellectual property or unauthorized media reuse' },
  { id: 'other', label: 'Other policy violation', desc: 'Any other violation of StreamVibe community guidelines' },
];

export default function ReportModal({ isOpen, onClose, entityType = 'Video', entityId, entityTitle }) {
  const [selectedReason, setSelectedReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReason) {
      setError('Please select a reason for reporting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await reportService.create({
        entityType,
        entityId,
        reason: selectedReason,
        description: description.trim(),
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1800);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit report. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-[#17171D] border border-[#23232C] rounded-2xl p-6 shadow-2xl relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Report Submitted</h3>
            <p className="text-xs text-zinc-400 max-w-xs">
              Thank you for helping keep StreamVibe safe. Our moderation team will review this report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FF3038]/10 flex items-center justify-center text-[#FF3038] shrink-0">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h3 id="report-modal-title" className="text-base font-bold text-white">
                  Report {entityType}
                </h3>
                {entityTitle && (
                  <p className="text-xs text-zinc-400 truncate max-w-[280px]">
                    {entityTitle}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Reasons List */}
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {REPORT_REASONS.map((r) => {
                const isSelected = selectedReason === r.id;
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#FF3038] bg-[#FF3038]/5'
                        : 'border-[#23232C] hover:border-zinc-700 bg-white/[0.02]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={isSelected}
                      onChange={() => setSelectedReason(r.id)}
                      className="mt-0.5 accent-[#FF3038]"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white">{r.label}</span>
                      <span className="text-[11px] text-zinc-500">{r.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-desc" className="text-xs font-medium text-zinc-300">
                Additional details (optional)
              </label>
              <textarea
                id="report-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Provide additional context to help our moderators review..."
                className="w-full bg-[#0B0B0F] border border-[#23232C] rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3038] resize-none"
              />
              <span className="text-[10px] text-zinc-500 text-right">
                {description.length}/1000
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                className="px-5 font-bold"
              >
                Submit Report
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
