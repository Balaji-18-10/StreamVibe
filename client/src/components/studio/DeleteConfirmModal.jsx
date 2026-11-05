import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { videoService } from '../../services/index.js';

export default function DeleteConfirmModal({ video, isOpen, onClose, onDeleted }) {
  if (!isOpen || !video) return null;

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await videoService.delete(video._id);
      if (res.data?.success) {
        onDeleted?.(video._id);
        onClose();
      } else {
        setError(res.data?.message || 'Failed to delete video');
      }
    } catch (err) {
      console.error('Delete video error:', err);
      setError(err.response?.data?.message || 'Failed to delete video. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#17171D] border border-red-500/20 rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shadow-lg shadow-red-500/10">
          <Trash2 className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white mb-1.5">Permanently delete this video?</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Deleting is permanent and cannot be undone. All views, comments, and Cloudinary media files
            for this video will be removed.
          </p>
        </div>

        {/* Video Card Preview */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#0B0B0F] border border-white/5">
          <img
            src={
              video.thumbnail?.url ||
              video.thumbnail ||
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
            }
            alt={video.title}
            className="w-20 aspect-video rounded-xl object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">{video.title}</h4>
            <p className="text-[11px] text-zinc-400">{video.views || 0} views</p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
            {error}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete Forever'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
