import React, { useState } from 'react';
import { X, Upload, Image, Loader2, Check, AlertCircle } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import { videoService } from '../../services/index.js';

const CATEGORIES = [
  'Gaming',
  'Music',
  'Education',
  'Entertainment',
  'Sports',
  'Tech',
  'News',
  'Travel',
  'Food',
  'Other',
];

export default function EditVideoModal({ video, isOpen, onClose, onUpdated }) {
  if (!isOpen || !video) return null;

  const [title, setTitle] = useState(video.title || '');
  const [description, setDescription] = useState(video.description || '');
  const [category, setCategory] = useState(video.category || 'Other');
  const [tags, setTags] = useState(Array.isArray(video.tags) ? video.tags.join(', ') : '');
  const [visibility, setVisibility] = useState(video.visibility || 'public');

  const [newThumbnailFile, setNewThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(
    video.thumbnail?.url || video.thumbnail || ''
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      setError('Please select a valid image file (JPEG, PNG, WebP, GIF)');
      return;
    }

    setNewThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Video title cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('tags', tags);
      formData.append('visibility', visibility);

      if (newThumbnailFile) {
        formData.append('thumbnail', newThumbnailFile);
      }

      const res = await videoService.update(video._id, formData);
      if (res.data?.success) {
        onUpdated?.(res.data.data?.video);
        onClose();
      } else {
        setError(res.data?.message || 'Failed to update video');
      }
    } catch (err) {
      console.error('Update video error:', err);
      setError(err.response?.data?.message || 'Failed to update video. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#17171D] border border-[#23232C] rounded-3xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/5 sticky top-0 bg-[#17171D]/90 backdrop-blur-md z-10">
          <div>
            <h3 className="text-lg font-bold text-white">Edit Video Details</h3>
            <p className="text-xs text-zinc-400">Update metadata and settings for this video</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Title <span className="text-[#FF3038]">*</span>
            </label>
            <input
              type="text"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0B0B0F] border border-[#23232C] focus:border-[#FF3038] text-white text-sm rounded-xl px-4 py-2.5 outline-none transition-colors"
              placeholder="Add a title that describes your video"
              required
            />
            <span className="block text-[11px] text-zinc-500 text-right mt-1">
              {title.length}/100
            </span>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={description}
              maxLength={5000}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0B0B0F] border border-[#23232C] focus:border-[#FF3038] text-white text-sm rounded-xl p-4 outline-none transition-colors resize-none leading-relaxed"
              placeholder="Tell viewers about your video"
            />
            <span className="block text-[11px] text-zinc-500 text-right mt-1">
              {description.length}/5000
            </span>
          </div>

          {/* Thumbnail Preview & Change */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Thumbnail
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shrink-0">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors">
                <Image className="w-4 h-4 text-[#FF3038]" />
                <span>Replace Thumbnail</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Category & Visibility Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-[#23232C] focus:border-[#FF3038] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none transition-colors cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-[#23232C] focus:border-[#FF3038] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none transition-colors cursor-pointer"
              >
                <option value="public">Public — Anyone can watch</option>
                <option value="unlisted">Unlisted — Anyone with link</option>
                <option value="private">Private — Only you can watch</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-[#0B0B0F] border border-[#23232C] focus:border-[#FF3038] text-white text-sm rounded-xl px-4 py-2.5 outline-none transition-colors"
              placeholder="e.g. tech, coding, react, tutorial"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isSubmitting}
              className="px-6 shadow-lg shadow-[#FF3038]/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving Changes...
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
