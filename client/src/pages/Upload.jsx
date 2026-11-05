import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Globe,
  EyeOff,
  Lock,
  ArrowRight,
  RefreshCw,
  Clock,
  Layers,
  FileVideo,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import { videoService } from '../services/index.js';
import { useAuthStore } from '../store/authStore.js';
import { formatDuration } from '../utils/formatters.js';

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
];
const ALLOWED_THUMBNAIL_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024; // 10 MB

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

export default function Upload() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  // ─── Authentication Guard ──────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/login?redirect=/upload');
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  // ─── File States ───────────────────────────────────────────
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoResolution, setVideoResolution] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(null);

  // ─── Metadata Form States ──────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [type, setType] = useState('video');
  const [visibility, setVisibility] = useState('public');

  // ─── UI / Submission States ────────────────────────────────
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingThumb, setIsDraggingThumb] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [videoPreviewUrl, thumbnailPreviewUrl]);

  // ─── Video File Handler ────────────────────────────────────
  const handleSelectVideo = useCallback((file) => {
    setValidationError('');
    setUploadError('');

    if (!file) return;

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setValidationError('Invalid video format. Supported: MP4, WebM, MOV, and MKV.');
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setValidationError(`File exceeds 500 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreviewUrl(objectUrl);

    // Auto-populate title from filename if not set
    const baseName = file.name.replace(/\.[^/.]+$/, '').trim();
    if (!title && baseName) {
      setTitle(baseName.slice(0, 100));
    }

    // Inspect duration & dimensions
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = objectUrl;
    probe.onloadedmetadata = () => {
      const dur = probe.duration || 0;
      setVideoDuration(dur);
      if (probe.videoWidth && probe.videoHeight) {
        setVideoResolution({ width: probe.videoWidth, height: probe.videoHeight });
        // Auto-detect Short: if under 60 seconds and vertical/square aspect
        if (dur <= 60 && probe.videoHeight >= probe.videoWidth) {
          setType('short');
        } else if (dur <= 60) {
          // If under 60s, user can keep standard or switch to short
        }
      }
    };
  }, [title, videoPreviewUrl]);

  // ─── Thumbnail File Handler ────────────────────────────────
  const handleSelectThumbnail = useCallback((file) => {
    setValidationError('');
    if (!file) return;

    if (!ALLOWED_THUMBNAIL_TYPES.includes(file.type)) {
      setValidationError('Invalid image format. Supported: JPG, PNG, WebP, GIF.');
      return;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      setValidationError('Thumbnail must be less than 10 MB.');
      return;
    }

    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setThumbnailFile(file);
    setThumbnailPreviewUrl(objectUrl);
  }, [thumbnailPreviewUrl]);

  // ─── Drag & Drop for Video ─────────────────────────────────
  const handleVideoDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVideo(true);
  };

  const handleVideoDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVideo(false);
  };

  const handleVideoDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVideo(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectVideo(e.dataTransfer.files[0]);
    }
  };

  // ─── Drag & Drop for Thumbnail ─────────────────────────────
  const handleThumbDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingThumb(true);
  };

  const handleThumbDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingThumb(false);
  };

  const handleThumbDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingThumb(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectThumbnail(e.dataTransfer.files[0]);
    }
  };

  // ─── Tags Logic ────────────────────────────────────────────
  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/^[#,\s]+/, '');
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    if (tags.length >= 20) {
      setValidationError('Maximum 20 tags allowed.');
      return;
    }
    setTags([...tags, trimmed]);
    setTagInput('');
  };

  const handleRemoveTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // ─── Upload Submission ─────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setUploadError('');

    if (!videoFile) {
      setValidationError('Please select a video file to upload.');
      return;
    }

    if (!title.trim()) {
      setValidationError('Please enter a video title.');
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('category', category);
    formData.append('type', type);
    formData.append('visibility', visibility);
    formData.append('tags', tags.join(','));

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusText('Uploading media to StreamVibe...');

    try {
      const res = await videoService.upload(formData, (percent) => {
        setUploadProgress(percent);
        if (percent < 100) {
          setUploadStatusText(`Uploading file: ${percent}%`);
        } else {
          setUploadStatusText('Transcoding and optimizing on Cloudinary...');
        }
      });

      if (res.data?.success && res.data?.data?.video) {
        setUploadedVideo(res.data.data.video);
      } else {
        throw new Error(res.data?.message || 'Failed to complete video upload.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(
        err.response?.data?.message ||
        err.message ||
        'Upload failed. Please check your network and try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Reset State for Another Upload ────────────────────────
  const handleReset = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);

    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(0);
    setVideoResolution(null);
    setThumbnailFile(null);
    setThumbnailPreviewUrl(null);
    setTitle('');
    setDescription('');
    setCategory('Entertainment');
    setTags([]);
    setTagInput('');
    setType('video');
    setVisibility('public');
    setValidationError('');
    setUploadError('');
    setUploadProgress(0);
    setUploadedVideo(null);
    setCopiedLink(false);
  };

  // Format bytes helper
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const videoWatchUrl = uploadedVideo
    ? `${window.location.origin}/${uploadedVideo.type === 'short' ? 'shorts' : 'watch'}/${uploadedVideo._id}`
    : '';

  const handleCopyLink = () => {
    if (!videoWatchUrl) return;
    navigator.clipboard.writeText(videoWatchUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#23232C]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <span className="p-2 rounded-xl bg-[#FF3038]/10 text-[#FF3038] border border-[#FF3038]/20">
                <UploadIcon className="w-6 h-6" />
              </span>
              Creator Studio — Upload
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Upload, optimize, and publish high-definition videos or shorts to StreamVibe.
            </p>
          </div>

          <Link to="/studio">
            <Button variant="secondary" size="sm" className="hidden sm:flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Creator Studio
            </Button>
          </Link>
        </div>

        {/* ─── SUCCESS SCREEN (When Uploaded) ────────────────── */}
        {uploadedVideo ? (
          <div className="bg-[#17171D] border border-green-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 mb-6 shadow-lg shadow-green-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 mb-3">
                Successfully Published
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                Your video is now live!
              </h2>
              <p className="text-zinc-400 text-sm mb-8">
                Your video has been encoded, verified on Cloudinary, and saved with complete metadata.
              </p>

              {/* Uploaded Video Card Preview */}
              <div className="w-full bg-[#1F1F28] border border-[#2A2A38] rounded-2xl p-4 mb-8 text-left flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
                  <img
                    src={
                      uploadedVideo.thumbnail?.url ||
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                    }
                    alt={uploadedVideo.title}
                    className="w-full h-full object-cover"
                  />
                  {uploadedVideo.videoFile?.duration > 0 && (
                    <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                      {formatDuration(uploadedVideo.videoFile.duration)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant={uploadedVideo.visibility === 'public' ? 'success' : 'default'} size="sm">
                      {uploadedVideo.visibility}
                    </Badge>
                    <Badge variant="danger" size="sm">
                      {uploadedVideo.category}
                    </Badge>
                    {uploadedVideo.type === 'short' && (
                      <span className="text-[10px] font-bold bg-[#FF3038]/20 text-[#FF3038] px-2 py-0.5 rounded">
                        Short
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-base truncate mb-1">
                    {uploadedVideo.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {uploadedVideo.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Shareable Link Box */}
              <div className="w-full bg-[#0B0B0F] border border-[#23232C] rounded-xl p-3 flex items-center justify-between gap-3 mb-8">
                <span className="text-xs text-zinc-400 truncate text-left select-all font-mono">
                  {videoWatchUrl}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0 flex items-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                <Link
                  to={uploadedVideo.type === 'short' ? `/shorts` : `/watch/${uploadedVideo._id}`}
                  className="w-full sm:w-auto"
                >
                  <Button variant="primary" size="md" className="w-full sm:w-auto flex items-center justify-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Watch Video Now
                  </Button>
                </Link>

                <Link to="/studio?tab=content" className="w-full sm:w-auto">
                  <Button variant="secondary" size="md" className="w-full sm:w-auto flex items-center justify-center gap-2">
                    <Layers className="w-4 h-4" />
                    Manage in Studio
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="md"
                  onClick={handleReset}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-zinc-300"
                >
                  <UploadIcon className="w-4 h-4" />
                  Upload Another Video
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* ─── ERROR ALERTS ─────────────────────────────────── */}
            {validationError && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">{validationError}</span>
                <button
                  type="button"
                  onClick={() => setValidationError('')}
                  className="ml-auto text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {uploadError && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold">Upload Failed</p>
                  <p className="text-xs text-red-300/80 mt-0.5">{uploadError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadError('')}
                  className="ml-auto text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ─── STEP 1: INITIAL FILE DROPZONE (When no file selected) ─ */}
            {!videoFile ? (
              <div
                onDragOver={handleVideoDragOver}
                onDragLeave={handleVideoDragLeave}
                onDrop={handleVideoDrop}
                onClick={() => videoInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-3xl p-12 sm:p-20 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center group ${
                  isDraggingVideo
                    ? 'border-[#FF3038] bg-[#FF3038]/5 scale-[0.99]'
                    : 'border-[#27272A] hover:border-zinc-500 bg-[#17171D]'
                }`}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSelectVideo(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-24 h-24 rounded-full bg-[#1F1F28] border border-[#2A2A38] group-hover:border-[#FF3038]/50 flex items-center justify-center text-[#FF3038] mb-6 transition-all duration-300 group-hover:scale-110 shadow-xl">
                  <UploadIcon className="w-10 h-10" />
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Select video to upload or drag & drop
                </h2>
                <p className="text-sm text-zinc-400 max-w-md mb-6">
                  Share your high-definition video or vertical Short with the StreamVibe community.
                </p>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="shadow-lg shadow-[#FF3038]/20 pointer-events-none"
                >
                  Browse Files
                </Button>

                <div className="mt-8 pt-6 border-t border-[#23232C] flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <FileVideo className="w-4 h-4 text-zinc-400" /> MP4, WebM, MOV, MKV
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-zinc-400" /> Up to 500 MB
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#FF3038]" /> Auto-detects Shorts (&lt;60s)
                  </span>
                </div>
              </div>
            ) : (
              /* ─── STEP 2: METADATA FORM & PREVIEW ─────────────── */
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Form Details (2 cols) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Title */}
                    <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Title <span className="text-[#FF3038]">*</span>
                        </label>
                        <span className={`text-xs ${title.length > 90 ? 'text-[#FF3038]' : 'text-zinc-500'}`}>
                          {title.length}/100
                        </span>
                      </div>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                        placeholder="Add a title that catches your audience's attention"
                        disabled={isUploading}
                        className="w-full bg-[#111116] border border-[#23232C] focus:border-[#FF3038] rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Description
                        </label>
                        <span className={`text-xs ${description.length > 4500 ? 'text-[#FF3038]' : 'text-zinc-500'}`}>
                          {description.length}/5000
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
                        placeholder="Tell viewers about your video, include timestamps, links, or context..."
                        disabled={isUploading}
                        className="w-full bg-[#111116] border border-[#23232C] focus:border-[#FF3038] rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors resize-y min-h-[120px]"
                      />
                    </div>

                    {/* Thumbnail Selection */}
                    <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-5 space-y-4">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Custom Thumbnail
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">
                          Select or upload a picture that shows what's in your video. A good thumbnail stands out.
                        </p>
                      </div>

                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleSelectThumbnail(e.target.files[0]);
                          }
                        }}
                      />

                      {thumbnailPreviewUrl ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-[#111116] rounded-xl border border-[#23232C]">
                          <img
                            src={thumbnailPreviewUrl}
                            alt="Thumbnail preview"
                            className="w-40 aspect-video rounded-lg object-cover bg-black border border-zinc-700"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {thumbnailFile?.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatFileSize(thumbnailFile?.size)}
                            </p>
                            <div className="flex items-center gap-3 mt-3">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={isUploading}
                                onClick={() => thumbnailInputRef.current?.click()}
                              >
                                Change
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUploading}
                                onClick={() => {
                                  URL.revokeObjectURL(thumbnailPreviewUrl);
                                  setThumbnailFile(null);
                                  setThumbnailPreviewUrl(null);
                                }}
                                className="text-red-400 hover:text-red-300 border-red-500/20"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={handleThumbDragOver}
                          onDragLeave={handleThumbDragLeave}
                          onDrop={handleThumbDrop}
                          onClick={() => thumbnailInputRef.current?.click()}
                          className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
                            isDraggingThumb
                              ? 'border-[#FF3038] bg-[#FF3038]/5'
                              : 'border-[#2A2A38] hover:border-zinc-500 bg-[#111116]'
                          }`}
                        >
                          <ImageIcon className="w-8 h-8 text-zinc-500 mb-2" />
                          <p className="text-xs font-semibold text-zinc-300">
                            Click or drag an image here to upload custom thumbnail
                          </p>
                          <span className="text-[11px] text-zinc-500 mt-1">
                            JPG, PNG, WebP or GIF up to 10 MB
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Category & Tags */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Category */}
                      <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-5 space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Category
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          disabled={isUploading}
                          className="w-full bg-[#111116] border border-[#23232C] focus:border-[#FF3038] rounded-xl px-4 py-3 text-white text-sm outline-none"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Video Type: Regular vs Short */}
                      <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-5 space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                          <span>Video Format</span>
                          {videoDuration > 0 && videoDuration <= 60 && (
                            <span className="text-[10px] text-emerald-400 font-normal">
                              &lt; 60s detected
                            </span>
                          )}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setType('video')}
                            disabled={isUploading}
                            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                              type === 'video'
                                ? 'bg-[#FF3038]/10 border-[#FF3038] text-white shadow-sm'
                                : 'bg-[#111116] border-[#23232C] text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Film className="w-3.5 h-3.5" />
                            Standard
                          </button>
                          <button
                            type="button"
                            onClick={() => setType('short')}
                            disabled={isUploading}
                            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                              type === 'short'
                                ? 'bg-[#FF3038]/10 border-[#FF3038] text-white shadow-sm'
                                : 'bg-[#111116] border-[#23232C] text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#FF3038]" />
                            Short
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tags Input */}
                    <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Tags ({tags.length}/20)
                        </label>
                        <span className="text-xs text-zinc-500">
                          Press Enter or comma to add
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          placeholder="gaming, gameplay, review..."
                          disabled={isUploading || tags.length >= 20}
                          className="flex-1 bg-[#111116] border border-[#23232C] focus:border-[#FF3038] rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleAddTag}
                          disabled={!tagInput.trim() || tags.length >= 20 || isUploading}
                        >
                          Add
                        </Button>
                      </div>

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 bg-[#23232C] text-zinc-200 text-xs px-2.5 py-1 rounded-lg border border-zinc-700"
                            >
                              #{tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(idx)}
                                disabled={isUploading}
                                className="text-zinc-400 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Visibility Selection */}
                    <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-5 space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        Visibility
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label
                          className={`p-3.5 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                            visibility === 'public'
                              ? 'bg-[#FF3038]/10 border-[#FF3038] text-white shadow-sm'
                              : 'bg-[#111116] border-[#23232C] text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value="public"
                            checked={visibility === 'public'}
                            onChange={(e) => setVisibility(e.target.value)}
                            disabled={isUploading}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2 font-bold text-xs text-white">
                            <Globe className="w-3.5 h-3.5 text-emerald-400" />
                            Public
                          </div>
                          <span className="text-[11px] text-zinc-400">
                            Everyone can watch
                          </span>
                        </label>

                        <label
                          className={`p-3.5 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                            visibility === 'unlisted'
                              ? 'bg-[#FF3038]/10 border-[#FF3038] text-white shadow-sm'
                              : 'bg-[#111116] border-[#23232C] text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value="unlisted"
                            checked={visibility === 'unlisted'}
                            onChange={(e) => setVisibility(e.target.value)}
                            disabled={isUploading}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2 font-bold text-xs text-white">
                            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                            Unlisted
                          </div>
                          <span className="text-[11px] text-zinc-400">
                            Anyone with the link
                          </span>
                        </label>

                        <label
                          className={`p-3.5 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                            visibility === 'private'
                              ? 'bg-[#FF3038]/10 border-[#FF3038] text-white shadow-sm'
                              : 'bg-[#111116] border-[#23232C] text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value="private"
                            checked={visibility === 'private'}
                            onChange={(e) => setVisibility(e.target.value)}
                            disabled={isUploading}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2 font-bold text-xs text-white">
                            <Lock className="w-3.5 h-3.5 text-zinc-400" />
                            Private
                          </div>
                          <span className="text-[11px] text-zinc-400">
                            Only you can watch
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Player Preview & File Details */}
                  <div className="space-y-6">
                    <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-5 sticky top-20 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                        <span>Video Preview</span>
                        <Badge variant="primary" size="sm">
                          {type === 'short' ? 'Short' : 'Standard'}
                        </Badge>
                      </h3>

                      {/* Video Player */}
                      <div className="relative rounded-xl overflow-hidden bg-black border border-[#2A2A38] aspect-video flex items-center justify-center">
                        <video
                          src={videoPreviewUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* File Details */}
                      <div className="bg-[#111116] rounded-xl p-3 border border-[#23232C] space-y-2 text-xs">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>File Name</span>
                          <span className="text-white font-mono truncate max-w-[150px]">
                            {videoFile.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>File Size</span>
                          <span className="text-white">
                            {formatFileSize(videoFile.size)}
                          </span>
                        </div>
                        {videoDuration > 0 && (
                          <div className="flex items-center justify-between text-zinc-400">
                            <span>Duration</span>
                            <span className="text-white font-mono">
                              {formatDuration(videoDuration)}
                            </span>
                          </div>
                        )}
                        {videoResolution && (
                          <div className="flex items-center justify-between text-zinc-400">
                            <span>Dimensions</span>
                            <span className="text-white font-mono">
                              {videoResolution.width} × {videoResolution.height}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Change Video Button */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => videoInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Choose Different Video
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ─── UPLOAD PROGRESS & SUBMISSION ACTIONS ───── */}
                <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-6 shadow-xl">
                  {isUploading && (
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF3038]" />
                          {uploadStatusText}
                        </span>
                        <span className="font-bold text-white font-mono text-sm">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-[#111116] h-2.5 rounded-full overflow-hidden border border-[#23232C]">
                        <div
                          className="h-full bg-gradient-to-r from-[#FF3038] to-[#FF6B6B] transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      disabled={isUploading}
                      onClick={handleReset}
                      className="w-full sm:w-auto text-zinc-400 hover:text-white"
                    >
                      Discard & Start Over
                    </Button>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={isUploading || !title.trim()}
                      className="w-full sm:w-auto shadow-xl shadow-[#FF3038]/20 flex items-center justify-center gap-2 font-bold"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Publishing Video...
                        </>
                      ) : (
                        <>
                          <UploadIcon className="w-4 h-4" />
                          Upload & Publish Video
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}