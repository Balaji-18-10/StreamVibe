import React, { useState, useEffect } from 'react';
import { X, Edit3, Globe, Lock, EyeOff, Loader2 } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { playlistService } from '../../services/index.js';

export default function EditPlaylistModal({ playlist, isOpen, onClose, onUpdated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (playlist) {
      setName(playlist.name || '');
      setDescription(playlist.description || '');
      setVisibility(playlist.visibility || 'public');
      setError('');
    }
  }, [playlist]);

  if (!isOpen || !playlist) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Playlist name is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await playlistService.update(playlist._id, {
        name: name.trim(),
        description: description.trim(),
        visibility,
      });

      if (res.data?.success) {
        onUpdated?.(res.data.data.playlist);
        onClose();
      } else {
        setError(res.data?.message || 'Failed to update playlist.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update playlist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#17171D] border border-[#23232C] rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FF3038]/10 text-[#FF3038] border border-[#FF3038]/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Edit Playlist</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Title <span className="text-[#FF3038]">*</span>
              </label>
              <span className={`text-[11px] ${name.length > 140 ? 'text-[#FF3038]' : 'text-zinc-500'}`}>
                {name.length}/150
              </span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 150))}
              disabled={isSubmitting || playlist.isSystem}
              className="w-full bg-[#111116] border border-[#23232C] focus:border-[#FF3038] rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors disabled:opacity-50"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Description
              </label>
              <span className={`text-[11px] ${description.length > 1900 ? 'text-[#FF3038]' : 'text-zinc-500'}`}>
                {description.length}/2000
              </span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              placeholder="Add an optional description for this playlist..."
              disabled={isSubmitting}
              className="w-full bg-[#111116] border border-[#23232C] focus:border-[#FF3038] rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Privacy
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  visibility === 'public'
                    ? 'bg-[#FF3038]/10 border-[#FF3038] text-white'
                    : 'bg-[#111116] border-[#23232C] text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  Public
                </div>
                <span className="text-[10px] text-zinc-400">Anyone</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('unlisted')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  visibility === 'unlisted'
                    ? 'bg-[#FF3038]/10 border-[#FF3038] text-white'
                    : 'bg-[#111116] border-[#23232C] text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  Unlisted
                </div>
                <span className="text-[10px] text-zinc-400">Link only</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  visibility === 'private'
                    ? 'bg-[#FF3038]/10 border-[#FF3038] text-white'
                    : 'bg-[#111116] border-[#23232C] text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  Private
                </div>
                <span className="text-[10px] text-zinc-400">Only you</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}