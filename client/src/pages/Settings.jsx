import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Palette,
  Bell,
  Sliders,
  Upload,
  Camera,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  Lock,
  Mail,
  AtSign,
  Globe,
  Twitter,
  Instagram,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import { useAuthStore } from '../store/authStore.js';
import { userService, authService } from '../services/index.js';

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'preferences' | 'danger'

  // ─── Profile State ──────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.links?.website || '');
  const [twitter, setTwitter] = useState(user?.links?.twitter || '');
  const [instagram, setInstagram] = useState(user?.links?.instagram || '');

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // ─── Avatar & Banner Upload State ───────────────────────────
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // ─── Password Change State ──────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ─── Preferences State ──────────────────────────────────────
  const [autoplay, setAutoplay] = useState(() => {
    return localStorage.getItem('streamvibe_autoplay') !== 'false';
  });
  const [toastAlerts, setToastAlerts] = useState(() => {
    return localStorage.getItem('streamvibe_toast_alerts') !== 'false';
  });
  const [defaultQuality, setDefaultQuality] = useState(() => {
    return localStorage.getItem('streamvibe_default_quality') || 'auto';
  });

  // ─── Danger Zone: Delete Account ────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Synchronize initial form with user store
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setWebsite(user.links?.website || '');
      setTwitter(user.links?.twitter || '');
      setInstagram(user.links?.instagram || '');
    }
  }, [user]);

  // Password strength calculation
  const newPasswordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: '', color: 'bg-zinc-700' };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-red-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: 'Too short', color: 'bg-red-500' };
    }
  }, [newPassword]);

  // ─── 1. Handle Profile Update ───────────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const cleanDisplayName = displayName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanDisplayName) {
      setProfileError('Display name cannot be empty.');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setProfileError('Username must be at least 3 characters.');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await userService.updateProfile({
        displayName: cleanDisplayName,
        username: cleanUsername,
        email: cleanEmail,
        bio: bio.trim(),
        links: {
          website: website.trim(),
          twitter: twitter.trim(),
          instagram: instagram.trim(),
        },
      });

      if (res.data?.success) {
        updateUser(res.data.data.user);
        setProfileSuccess('Profile updated successfully.');
        setTimeout(() => setProfileSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Profile update failed:', err);
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── 2. Handle Avatar File Upload ───────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit.');
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setAvatarUploading(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await userService.updateAvatar(formData);
      if (res.data?.success) {
        updateUser({ avatar: res.data.data.avatar });
        setUploadSuccess('Avatar updated successfully.');
        setTimeout(() => setUploadSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload avatar.');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // ─── 3. Handle Banner File Upload ───────────────────────────
  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file for the banner.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Banner image size exceeds 10MB limit.');
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setBannerUploading(true);

    const formData = new FormData();
    formData.append('banner', file);

    try {
      const res = await userService.updateBanner(formData);
      if (res.data?.success) {
        updateUser({ banner: res.data.data.banner });
        setUploadSuccess('Channel banner updated successfully.');
        setTimeout(() => setUploadSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Banner upload failed:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload banner.');
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  // ─── 4. Handle Password Change ──────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
      });
      if (res.data?.success) {
        setPasswordSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setPasswordSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // ─── 5. Handle Preferences Change ───────────────────────────
  const toggleAutoplay = () => {
    const next = !autoplay;
    setAutoplay(next);
    localStorage.setItem('streamvibe_autoplay', String(next));
  };

  const toggleToastAlerts = () => {
    const next = !toastAlerts;
    setToastAlerts(next);
    localStorage.setItem('streamvibe_toast_alerts', String(next));
  };

  const changeDefaultQuality = (quality) => {
    setDefaultQuality(quality);
    localStorage.setItem('streamvibe_default_quality', quality);
  };

  // ─── 6. Handle Account Deletion ─────────────────────────────
  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeleting(true);

    try {
      const res = await userService.deleteAccount({ password: deletePassword });
      if (res.data?.success) {
        await logout();
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error('Account deletion failed:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Please verify password.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-2">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#17171D] border border-white/10 flex items-center justify-center text-[#FF3038] shadow-inner">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Account Settings</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Customize your channel profile, security credentials, and playback options
            </p>
          </div>
        </div>

        {/* Quick Link to Public Channel */}
        {user?.username && (
          <Button
            to={`/@${user.username}`}
            variant="outline"
            size="sm"
            className="rounded-full self-start sm:self-auto"
          >
            View Public Channel
          </Button>
        )}
      </div>

      {/* ─── Tab Navigation Bar ────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none border-b border-[#23232C]/60">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'profile'
              ? 'bg-[#FF3038] text-white shadow-lg shadow-[#FF3038]/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Channel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'security'
              ? 'bg-[#FF3038] text-white shadow-lg shadow-[#FF3038]/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security & Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'preferences'
              ? 'bg-[#FF3038] text-white shadow-lg shadow-[#FF3038]/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Preferences</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('danger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'danger'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-zinc-400 hover:text-red-400 hover:bg-red-500/5'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Danger Zone</span>
        </button>
      </div>

      {/* ─── TAB 1: Profile & Channel ──────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-8 animate-fade-in">
          {/* Upload Feedback */}
          {uploadSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{uploadSuccess}</span>
            </div>
          )}
          {uploadError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Banner & Avatar Visual Card */}
          <div className="bg-[#17171D] border border-[#23232C] rounded-3xl overflow-hidden shadow-xl">
            {/* Banner preview */}
            <div className="h-40 sm:h-56 w-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 relative group overflow-hidden">
              {user?.banner?.url ? (
                <img
                  src={user.banner.url}
                  alt="Channel Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                  <ImageIcon className="w-10 h-10 mb-1" />
                  <span className="text-xs">No banner uploaded</span>
                </div>
              )}

              {/* Banner Upload Button Overlay */}
              <div className="absolute top-4 right-4">
                <input
                  type="file"
                  ref={bannerInputRef}
                  onChange={handleBannerChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerUploading}
                  className="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 border border-white/10 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                >
                  {bannerUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF3038]" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  <span>Change Banner</span>
                </button>
              </div>
            </div>

            {/* Avatar Section */}
            <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16">
              <div className="flex items-end gap-4">
                <div className="relative group shrink-0">
                  <Avatar
                    src={user?.avatar?.url || user?.avatar}
                    name={user?.displayName || user?.username}
                    size="xl"
                    border
                    className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-[#17171D]"
                  />
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity"
                    title="Change Avatar"
                  >
                    {avatarUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#FF3038]" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span>Update</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pb-1">
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {user?.displayName || user?.username}
                  </h3>
                  <p className="text-xs text-zinc-400">@{user?.username}</p>
                </div>
              </div>

              <div className="text-xs text-zinc-500">
                Recommended: Avatar 400x400 • Banner 2560x424
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="bg-[#17171D] border border-[#23232C] rounded-3xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Basic Information</h3>
            <p className="text-xs text-zinc-400 mb-6">
              This information will be displayed on your public channel and video pages
            </p>

            {profileSuccess && (
              <div className="mb-6 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Display Name
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Channel Name"
                      className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Username Handle
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="handle"
                      className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-colors font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Channel Bio
                  </label>
                  <span className="text-[10px] text-zinc-500">{bio.length} / 1000</span>
                </div>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell your viewers what your channel is about..."
                  maxLength={1000}
                  className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl p-3.5 outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Social Links */}
              <div className="pt-2 border-t border-white/5 space-y-4">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Social Links
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Website */}
                  <div className="space-y-1">
                    <label className="block text-[11px] text-zinc-400">Website</label>
                    <div className="relative flex items-center">
                      <Globe className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://mysite.com"
                        className="w-full bg-[#0E0E12] border border-[#23232C] text-xs text-white placeholder-zinc-600 rounded-xl pl-8 pr-3 py-2 outline-none"
                      />
                    </div>
                  </div>

                  {/* Twitter */}
                  <div className="space-y-1">
                    <label className="block text-[11px] text-zinc-400">Twitter / X</label>
                    <div className="relative flex items-center">
                      <Twitter className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        placeholder="@username"
                        className="w-full bg-[#0E0E12] border border-[#23232C] text-xs text-white placeholder-zinc-600 rounded-xl pl-8 pr-3 py-2 outline-none"
                      />
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="space-y-1">
                    <label className="block text-[11px] text-zinc-400">Instagram</label>
                    <div className="relative flex items-center">
                      <Instagram className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@username"
                        className="w-full bg-[#0E0E12] border border-[#23232C] text-xs text-white placeholder-zinc-600 rounded-xl pl-8 pr-3 py-2 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Profile */}
              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={profileSaving}
                  disabled={profileSaving}
                  className="rounded-xl px-6 shadow-lg shadow-[#FF3038]/20"
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Security & Password ────────────────────────── */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-fade-in max-w-2xl">
          <div className="bg-[#17171D] border border-[#23232C] rounded-3xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Change Password</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Update your account password regularly to keep your channel safe
            </p>

            {passwordSuccess && (
              <div className="mb-6 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Current Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-11 py-2.5 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 p-1 rounded-lg text-zinc-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-11 py-2.5 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 p-1 rounded-lg text-zinc-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Meter */}
                {newPassword && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex items-center gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                            step <= newPasswordStrength.score
                              ? newPasswordStrength.color
                              : 'bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400">
                      <span>Strength: {newPasswordStrength.label}</span>
                      <span>Min 8 chars</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-11 py-2.5 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 p-1 rounded-lg text-zinc-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={passwordSaving}
                  disabled={passwordSaving}
                  className="rounded-xl px-6"
                >
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Preferences ────────────────────────────────── */}
      {activeTab === 'preferences' && (
        <div className="space-y-4 animate-fade-in max-w-3xl">
          {/* Theme & Visuals */}
          <div className="p-5 rounded-3xl bg-[#17171D] border border-[#23232C] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/5 text-[#FF3038]">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Platform Theme</h3>
                <p className="text-xs text-zinc-400">
                  StreamVibe is engineered with an ultra-dark cinematic aesthetic (#0B0B0F)
                </p>
              </div>
            </div>
            <Badge variant="accent">Cinematic Dark</Badge>
          </div>

          {/* Real-Time Toast Notifications */}
          <div className="p-5 rounded-3xl bg-[#17171D] border border-[#23232C] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/5 text-emerald-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Real-Time Alerts</h3>
                <p className="text-xs text-zinc-400">
                  Show immediate toast popups when new comments, likes, or subscribers arrive
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleToastAlerts}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                toastAlerts ? 'bg-[#FF3038]' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  toastAlerts ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Autoplay Next Video */}
          <div className="p-5 rounded-3xl bg-[#17171D] border border-[#23232C] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/5 text-blue-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Autoplay Next Video</h3>
                <p className="text-xs text-zinc-400">
                  Automatically start recommended videos when the current video ends
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleAutoplay}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                autoplay ? 'bg-[#FF3038]' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  autoplay ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Default Playback Quality */}
          <div className="p-5 rounded-3xl bg-[#17171D] border border-[#23232C] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Default Video Quality</h3>
              <p className="text-xs text-zinc-400">
                Choose preferred resolution for video streams
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#0E0E12] p-1 rounded-xl border border-[#23232C]">
              {['auto', '1080p', '720p', '480p'].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => changeDefaultQuality(q)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    defaultQuality === q
                      ? 'bg-[#FF3038] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: Danger Zone ────────────────────────────────── */}
      {activeTab === 'danger' && (
        <div className="space-y-6 animate-fade-in max-w-2xl">
          {/* Sign Out Card */}
          <div className="bg-[#17171D] border border-[#23232C] rounded-3xl p-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Sign Out</h3>
              <p className="text-xs text-zinc-400">
                End your active session on this device
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={LogOut}
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="text-red-400 hover:text-red-300 hover:border-red-500/50"
            >
              Sign Out
            </Button>
          </div>

          {/* Permanent Account Deletion */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 sm:p-8">
            <h3 className="text-base font-bold text-red-400 mb-1">Delete Account Permanently</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Deleting your account is permanent. All your uploaded videos, channel comments, custom
              playlists, subscriber counts, and preferences will be permanently wiped. This action
              cannot be undone.
            </p>
            <Button
              variant="danger"
              size="md"
              leftIcon={Trash2}
              onClick={() => setDeleteModalOpen(true)}
              className="rounded-xl px-6"
            >
              Delete My Account
            </Button>
          </div>

          {/* Delete Confirmation Modal */}
          {deleteModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[#17171D] border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white text-center mb-1">
                  Are you absolutely sure?
                </h3>
                <p className="text-xs text-zinc-400 text-center mb-6 leading-relaxed">
                  Please enter your password to confirm permanent account deletion.
                </p>

                {deleteError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Account Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full bg-[#0E0E12] border border-[#23232C] text-sm text-white rounded-xl px-4 py-2.5 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeleteModalOpen(false);
                        setDeletePassword('');
                        setDeleteError('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      isLoading={isDeleting}
                      disabled={isDeleting || !deletePassword}
                      onClick={handleDeleteAccount}
                    >
                      Permanently Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
