import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  ListPlus,
  Plus,
  Check,
  Loader2,
  Globe,
  Lock,
  EyeOff,
} from 'lucide-react';
import Button from '../ui/Button.jsx';
import { playlistService } from '../../services/index.js';
import { useAuthStore } from '../../store/authStore.js';

export default function SaveToPlaylistModal({ video, isOpen, onClose }) {
  const { isAuthenticated } = useAuthStore();
  const [playlists, setPlaylists] = useState([]);
  const [watchLaterPlaylist, setWatchLaterPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVisibility, setNewVisibility] = useState('private');
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState('');

  const videoId = video?._id || video?.id;

  useEffect(() => {
    if (isOpen && isAuthenticated && videoId) {
      fetchUserPlaylists();
    }
  }, [isOpen, isAuthenticated, videoId]);

  const fetchUserPlaylists = async () => {
    setIsLoading(true);
    try {
      const [customRes, watchLaterRes] = await Promise.all([
        playlistService.getMyPlaylists(),
        playlistService.getWatchLater(),
      ]);

      if (customRes.data?.success) {
        setPlaylists(customRes.data.data.playlists || []);
      }
      if (watchLaterRes.data?.success) {
        setWatchLaterPlaylist(watchLaterRes.data.data.playlist);
      }
    } catch (err) {
      console.warn('Failed to load user playlists:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !video) return null;

  const isVideoInPlaylist = (playlist) => {
    if (!playlist || !playlist.videos) return false;
    return playlist.videos.some((v) => {
      const vId = v.video?._id || v.video;
      return String(vId) === String(videoId);
    });
  };

  const handleToggleWatchLater = async () => {
    if (actionLoadingId) return;
    setActionLoadingId('watch-later');
    const inWatchLater = isVideoInPlaylist(watchLaterPlaylist);

    try {
      if (inWatchLater) {
        await playlistService.removeFromWatchLater(videoId);
        setMessage('Removed from Watch Later');
      } else {
        await playlistService.addToWatchLater(videoId);
        setMessage('Added to Watch Later');
      }
      // Refresh watch later state
      const wlRes = await playlistService.getWatchLater();
      if (wlRes.data?.success) {
        setWatchLaterPlaylist(wlRes.data.data.playlist);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update Watch Later.');
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setMessage(''), 2500);
    }
  };

  const handleTogglePlaylist = async (playlist) => {
    if (actionLoadingId) return;
    setActionLoadingId(playlist._id);
    const inPlaylist = isVideoInPlaylist(playlist);

    try {
      if (inPlaylist) {
        await playlistService.removeVideo(playlist._id, videoId);
        setMessage(`Removed from "${playlist.name}"`);
      } else {
        await playlistService.addVideo(playlist._id, videoId);
        setMessage(`Added to "${playlist.name}"`);
      }
      // Refresh custom playlists
      const customRes = await playlistService.getMyPlaylists();
      if (customRes.data?.success) {
        setPlaylists(customRes.data.data.playlists || []);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update playlist.');
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setMessage(''), 2500);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      const res = await playlistService.create({
        name: newName.trim(),
        visibility: newVisibility,
        videoId, // Add this video immediately
      });

      if (res.data?.success) {
        setNewName('');
        setShowCreate(false);
        setMessage(`Added to new playlist "${res.data.data.playlist.name}"`);
        fetchUserPlaylists();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create playlist.');
    } finally {
      setIsCreating(false);
      setTimeout(() => setMessage(''), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#17171D] border border-[#23232C] rounded-3xl p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ListPlus className="w-4 h-4 text-[#FF3038]" />
            Save video to...
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Toast */}
        {message && (
          <div className="my-2.5 p-2 rounded-xl bg-[#FF3038]/10 border border-[#FF3038]/20 text-[#FF3038] text-xs font-semibold text-center">
            {message}
          </div>
        )}

        {/* Playlists List */}
        <div className="my-3 max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin text-[#FF3038]" />
              <span className="text-xs">Loading your playlists...</span>
            </div>
          ) : (
            <>
              {/* Watch Later Item */}
              <div
                onClick={handleToggleWatchLater}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isVideoInPlaylist(watchLaterPlaylist)
                      ? 'bg-[#FF3038] border-[#FF3038] text-white'
                      : 'border-zinc-600 bg-transparent'
                  }`}>
                    {isVideoInPlaylist(watchLaterPlaylist) && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Watch Later</span>
                  </div>
                </div>

                {actionLoadingId === 'watch-later' && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                )}
              </div>

              {/* Custom Playlists */}
              {playlists.map((pl) => {
                const inPl = isVideoInPlaylist(pl);
                return (
                  <div
                    key={pl._id}
                    onClick={() => handleTogglePlaylist(pl)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                        inPl
                          ? 'bg-[#FF3038] border-[#FF3038] text-white'
                          : 'border-zinc-600 bg-transparent'
                      }`}>
                        {inPl && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-medium text-white truncate">
                        {pl.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {pl.visibility === 'private' && <Lock className="w-3 h-3 text-zinc-500" />}
                      {pl.visibility === 'unlisted' && <EyeOff className="w-3 h-3 text-zinc-500" />}
                      {actionLoadingId === pl._id && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer: Create New Playlist Accordion */}
        <div className="pt-3 border-t border-white/5">
          {showCreate ? (
            <form onSubmit={handleCreatePlaylist} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.slice(0, 150))}
                  placeholder="Enter playlist title..."
                  disabled={isCreating}
                  className="w-full bg-[#111116] border border-[#23232C] focus:border-[#FF3038] rounded-xl px-3 py-2 text-white text-xs outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <select
                  value={newVisibility}
                  onChange={(e) => setNewVisibility(e.target.value)}
                  disabled={isCreating}
                  className="bg-[#111116] border border-[#23232C] rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 outline-none"
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCreating}
                    onClick={() => setShowCreate(false)}
                    className="text-xs py-1 px-2.5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isCreating || !newName.trim()}
                    className="text-xs py-1 px-3"
                  >
                    {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4 text-[#FF3038]" />
              <span>Create new playlist</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}