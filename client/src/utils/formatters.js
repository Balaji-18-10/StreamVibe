import { formatDistanceToNowStrict } from 'date-fns';

/**
 * Format raw view count into clean human-readable text (e.g. 1.2K, 3.4M).
 * @param {number} count
 * @returns {string}
 */
export const formatViews = (count = 0) => {
  const num = Number(count) || 0;
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B views`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
  }
  return `${num} ${num === 1 ? 'view' : 'views'}`;
};

/**
 * Format duration in seconds to MM:SS or HH:MM:SS.
 * @param {number} totalSeconds
 * @returns {string}
 */
export const formatDuration = (totalSeconds = 0) => {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const paddedSec = String(seconds).padStart(2, '0');
  if (hours > 0) {
    const paddedMin = String(minutes).padStart(2, '0');
    return `${hours}:${paddedMin}:${paddedSec}`;
  }
  return `${minutes}:${paddedSec}`;
};

/**
 * Format relative time ago (e.g. 2 hours ago, 3 days ago).
 * @param {string|Date} date
 * @returns {string}
 */
export const formatTimeAgo = (date) => {
  if (!date) return 'Recently';
  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return 'Recently';
    return `${formatDistanceToNowStrict(parsed)} ago`;
  } catch {
    return 'Recently';
  }
};

/**
 * Format date for joined/created timestamp (e.g. Nov 3, 2026).
 * @param {string|Date} date
 * @returns {string}
 */
export const formatJoinedDate = (date) => {
  if (!date) return 'Recently';
  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return 'Recently';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
};

/**
 * Automatically injects Cloudinary dynamic optimization transformations:
 * f_auto (format negotiation: AVIF/WebP) and q_auto (intelligent quality compression).
 * Supports optional width scaling.
 * @param {string} url
 * @param {object} options
 * @returns {string}
 */
export const optimizeCloudinaryUrl = (url, { width, quality = 'auto', format = 'auto' } = {}) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
  if (url.includes('/f_auto') || url.includes('/q_auto')) return url;

  const transformations = [`f_${format}`, `q_${quality}`];
  if (width) transformations.push(`w_${width}`, 'c_limit');
  const transformStr = transformations.join(',');

  return url.replace('/upload/', `/upload/${transformStr}/`);
};
