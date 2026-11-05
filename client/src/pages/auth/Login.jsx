import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import Button from '../../components/ui/Button.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [validationError, setValidationError] = useState('');

  // Load remembered identifier if saved
  useEffect(() => {
    const saved = localStorage.getItem('streamvibe_remembered_identifier');
    if (saved) {
      setIdentifier(saved);
    }
    clearError();
  }, [clearError]);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setValidationError('Please enter your email or username.');
      return;
    }
    if (!password) {
      setValidationError('Please enter your password.');
      return;
    }

    // Save or clear remembered identifier
    if (rememberMe) {
      localStorage.setItem('streamvibe_remembered_identifier', cleanIdentifier);
    } else {
      localStorage.removeItem('streamvibe_remembered_identifier');
    }

    const res = await login({
      identifier: cleanIdentifier,
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
        <div className="text-center mb-8">
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Sign in to continue to your personal feed, studio, and subscriptions
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
            {/* Identifier input */}
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
              >
                Email or Username
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username email"
                  placeholder="name@example.com or username"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-3 transition-colors outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#FF3038] hover:text-[#ff4f56] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
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
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0E0E12] border-[#23232C] text-[#FF3038] focus:ring-0 focus:ring-offset-0 focus:outline-none accent-[#FF3038] cursor-pointer"
                />
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  Remember my identifier
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full justify-center shadow-lg shadow-[#FF3038]/25"
                rightIcon={ArrowRight}
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Footer link to Register */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-400">
              Don&apos;t have an account?{' '}
              <Link
                to={redirectPath !== '/' ? `/register?redirect=${encodeURIComponent(redirectPath)}` : '/register'}
                className="text-white hover:text-[#FF3038] font-semibold transition-colors underline-offset-4 hover:underline"
              >
                Create one now
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
