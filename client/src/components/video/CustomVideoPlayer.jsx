import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatDuration } from '../../utils/formatters.js';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function CustomVideoPlayer({
  url,
  thumbnail,
  title = '',
  onPlay,
  onEnded,
  className = '',
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const progressBarRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  // Reset error when URL changes
  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
    setIsPlaying(false);
    setCurrentTime(0);
    setHasStartedPlaying(false);
  }, [url]);

  // ─── Playback Controls ─────────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (video.paused || video.ended) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          if (!hasStartedPlaying) {
            setHasStartedPlaying(true);
            onPlay?.();
          }
        })
        .catch((err) => {
          console.warn('Playback play failed:', err);
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [hasError, hasStartedPlaying, onPlay]);

  // ─── Seek Controls ─────────────────────────────────────────
  const seekTo = useCallback(
    (seconds) => {
      const video = videoRef.current;
      if (!video) return;
      const target = Math.max(0, Math.min(seconds, duration || video.duration || 0));
      video.currentTime = target;
      setCurrentTime(target);
    },
    [duration]
  );

  const handleProgressBarClick = (e) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(clickX / rect.width, 1));
    seekTo(fraction * duration);
  };

  // ─── Volume Controls ───────────────────────────────────────
  const handleVolumeChange = (newVolume) => {
    const video = videoRef.current;
    const clamped = Math.max(0, Math.min(newVolume, 1));
    setVolume(clamped);
    if (video) {
      video.volume = clamped;
      video.muted = clamped === 0;
    }
    setIsMuted(clamped === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      video.volume = volume > 0 ? volume : 1;
      setIsMuted(false);
      if (volume === 0) setVolume(1);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  // ─── Speed Controls ────────────────────────────────────────
  const changeSpeed = (rate) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setSpeedMenuOpen(false);
  };

  // ─── Fullscreen Controls ───────────────────────────────────
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container
        .requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.warn('Fullscreen error:', err));
    } else {
      document
        .exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.warn('Exit fullscreen error:', err));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ─── Autohide Controls on Inactivity ───────────────────────
  const showControlsTemporarily = () => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
        setSpeedMenuOpen(false);
      }, 2500);
    }
  };

  const handleMouseMove = () => {
    showControlsTemporarily();
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setControlsVisible(false);
      setSpeedMenuOpen(false);
    }
  };

  // ─── Keyboard Shortcuts ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keyboard shortcuts if focus is inside an input, textarea, or contentEditable
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          showControlsTemporarily();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          showControlsTemporarily();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          seekTo(currentTime - 5);
          showControlsTemporarily();
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          seekTo(currentTime + 5);
          showControlsTemporarily();
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          showControlsTemporarily();
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          showControlsTemporarily();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekTo, currentTime, volume, toggleFullscreen]);

  // ─── HTML5 Video Events ────────────────────────────────────
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsBuffering(false);
      setHasError(false);
    }
  };

  const handleError = () => {
    setIsBuffering(false);
    setIsPlaying(false);
    setHasError(true);
    setErrorMessage('This video is currently unavailable or cannot be played.');
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none group shadow-2xl shadow-black/80 ${className}`}
    >
      {/* ─── Native Video Element ──────────────────────────────── */}
      {url ? (
        <video
          ref={videoRef}
          src={url}
          poster={thumbnail}
          playsInline
          preload="metadata"
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            onEnded?.();
          }}
          onError={handleError}
          className="w-full h-full object-contain cursor-pointer"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#121217]">
          <AlertCircle className="w-12 h-12 text-zinc-500 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Video Source</h3>
          <p className="text-xs text-[#A1A1AA]">A valid video URL was not provided for playback.</p>
        </div>
      )}

      {/* ─── Buffering Spinner ─────────────────────────────────── */}
      {isBuffering && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <Loader2 className="w-12 h-12 text-[#FF3038] animate-spin drop-shadow-md" />
        </div>
      )}

      {/* ─── Playback Error State ──────────────────────────────── */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center z-20">
          <AlertCircle className="w-12 h-12 text-[#FF3038] mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Playback Error</h3>
          <p className="text-xs text-[#A1A1AA] max-w-sm mb-4 leading-relaxed">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => {
              if (videoRef.current) {
                setHasError(false);
                videoRef.current.load();
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#17171D] hover:bg-[#202027] text-white border border-[#23232C] transition-colors"
          >
            Retry Playback
          </button>
        </div>
      )}

      {/* ─── Big Center Play Button (When Paused) ──────────────── */}
      {!isPlaying && !isBuffering && !hasError && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-[#FF3038]/90 text-white flex items-center justify-center shadow-xl shadow-[#FF3038]/40 hover:scale-110 active:scale-95 transition-all duration-200">
            <Play className="w-7 h-7 fill-white ml-1" />
          </div>
        </div>
      )}

      {/* ─── Custom Controls Overlay ───────────────────────────── */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-3 pt-10 flex flex-col gap-2.5 transition-opacity duration-300 z-10 ${
          controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar Track */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          className="relative w-full h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer transition-all group/track"
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-[#FF3038] rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Thumb scrub dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md shadow-black/80 opacity-0 group-hover/track:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 7px)` }}
          />
        </div>

        {/* Buttons and Settings Bar */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors"
              title={isPlaying ? 'Pause (k)' : 'Play (k)'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Quick 10s Rewind */}
            <button
              type="button"
              onClick={() => seekTo(currentTime - 10)}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Rewind 10s (j)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Quick 10s Forward */}
            <button
              type="button"
              onClick={() => seekTo(currentTime + 10)}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Fast forward 10s (l)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume & Mute */}
            <div className="flex items-center gap-2 group/volume">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Volume Slider */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 accent-[#FF3038] bg-white/30 rounded-lg cursor-pointer"
                title="Volume"
              />
            </div>

            {/* Timestamp Display */}
            <div className="text-[11px] font-medium text-zinc-300 ml-1">
              <span>{formatDuration(currentTime)}</span>
              <span className="mx-1 text-zinc-500">/</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 relative">
            {/* Speed Selector Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedMenuOpen((prev) => !prev)}
                className="px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 text-[11px] font-semibold transition-colors flex items-center gap-1"
                title="Playback Speed"
              >
                <span>{playbackRate === 1 ? '1x' : `${playbackRate}x`}</span>
              </button>

              {speedMenuOpen && (
                <div className="absolute right-0 bottom-8 w-28 bg-[#17171D] border border-[#23232C] rounded-xl p-1 shadow-2xl z-30 flex flex-col gap-0.5">
                  <span className="px-2 py-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    Speed
                  </span>
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changeSpeed(rate)}
                      className={`px-2 py-1 rounded-lg text-xs text-left font-medium transition-colors ${
                        playbackRate === rate
                          ? 'bg-[#FF3038]/20 text-[#FF3038] font-bold'
                          : 'text-zinc-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {rate === 1 ? 'Normal' : `${rate}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
