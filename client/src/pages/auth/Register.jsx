import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Play,
  User,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import Button from '../../components/ui/Button.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { register, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Clear errors on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  // If already logged in, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-zinc-700' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

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
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    const cleanDisplayName = displayName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanDisplayName) {
      setValidationError('Please enter your display name.');
      return;
    }
    if (!cleanUsername) {
      setValidationError('Please enter a username.');
      return;
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setValidationError('Username must be between 3 and 30 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setValidationError('Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (!cleanEmail) {
      setValidationError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setValidationError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    const res = await register({
      displayName: cleanDisplayName,
      username: cleanUsername,
      email: cleanEmail,
      password,
    });

    if (res.success) {
      navigate(redirectPath, { replace: true });
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF3038]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 group transition-transform duration-200 hover:scale-105 mb-4"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF3038] to-[#FF6B6B] flex items-center justify-center shadow-lg shadow-[#FF3038]/30">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Stream<span className="text-[#FF3038]">Vibe</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Join thousands of creators and viewers sharing unique video stories
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#17171D] border border-[#23232C] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-sm">
          {/* Error Banner */}
          {displayError && (
            <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed font-medium">{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="displayName"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
              >
                Channel / Display Name
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="displayName"
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-3 transition-colors outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
              >
                Username handle
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                  <AtSign className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  placeholder="e.g. alexmorgan"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''));
                    if (validationError) setValidationError('');
                  }}
                  className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-3 transition-colors outline-none font-mono text-xs"
                  disabled={isLoading}
                />
              </div>
              <p className="text-[11px] text-zinc-500 pl-1">
                Your unique URL will be: streamvibe.io/@{username || 'username'}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-3 transition-colors outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-11 py-3 transition-colors outline-none"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-3 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {password && (
                <div className="pt-1.5 space-y-1">
                  <div className="flex items-center gap-1.5 h-1.5 w-full">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                          step <= passwordStrength.score ? passwordStrength.color : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-400">
                    <span>Strength: {passwordStrength.label}</span>
                    <span>Use 8+ chars with uppercase, numbers & symbols</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
              >
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-11 py-3 transition-colors outline-none"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-3 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password === confirmPassword && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 pl-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                </p>
              )}
            </div>

            {/* Terms and conditions */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded bg-[#0E0E12] border-[#23232C] text-[#FF3038] focus:ring-0 focus:ring-offset-0 focus:outline-none accent-[#FF3038] cursor-pointer"
                />
                <span className="text-xs text-zinc-400 leading-normal">
                  I agree to the{' '}
                  <span className="text-zinc-200 underline">Terms of Service</span> and{' '}
                  <span className="text-zinc-200 underline">Privacy Policy</span>.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full justify-center shadow-lg shadow-[#FF3038]/25"
                rightIcon={ArrowRight}
              >
                Create Account
              </Button>
            </div>
          </form>

          {/* Footer link to Login */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-400">
              Already have an account?{' '}
              <Link
                to={redirectPath !== '/' ? `/login?redirect=${encodeURIComponent(redirectPath)}` : '/login'}
                className="text-white hover:text-[#FF3038] font-semibold transition-colors underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home link */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
          >
            ← Return to StreamVibe Home
          </Link>
        </div>
      </div>
    </div>
  );
}
