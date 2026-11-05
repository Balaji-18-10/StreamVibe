import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import Button from '../../components/ui/Button.jsx';

export default function ResetPassword() {
  const { token: urlToken } = useParams();
  const navigate = useNavigate();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  const [token, setToken] = useState(urlToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Password strength
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

    const activeToken = (token || urlToken || '').trim();
    if (!activeToken) {
      setValidationError('Password reset token is missing. Please request a new link.');
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

    const res = await resetPassword(activeToken, password);
    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2500);
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Set new password</h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Choose a strong password to secure your StreamVibe account
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#17171D] border border-[#23232C] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-sm">
          {isSuccess ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Password reset successful</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your password has been securely updated. You are being redirected to your home
                  feed...
                </p>
              </div>

              <div className="pt-2">
                <Button
                  to="/"
                  variant="primary"
                  size="md"
                  rightIcon={ArrowRight}
                  className="w-full justify-center"
                >
                  Go to StreamVibe Home
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Banner */}
              {displayError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-red-300 leading-relaxed font-medium">
                      {displayError}
                    </p>
                    {displayError.toLowerCase().includes('token') && (
                      <Link
                        to="/forgot-password"
                        className="text-xs text-[#FF3038] hover:underline font-semibold mt-1 inline-block"
                      >
                        Request a new reset link
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Token input (only if not in URL) */}
              {!urlToken && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="token"
                    className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
                  >
                    Reset Token
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="token"
                      type="text"
                      placeholder="Paste reset token"
                      value={token}
                      onChange={(e) => {
                        setToken(e.target.value);
                        if (validationError) setValidationError('');
                      }}
                      className="w-full bg-[#0E0E12] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-3 transition-colors outline-none font-mono text-xs"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
                >
                  New Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="newPassword"
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
                      <span>Min 8 characters</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirmNewPassword"
                  className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
                >
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmNewPassword"
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

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="w-full justify-center shadow-lg shadow-[#FF3038]/25"
                >
                  Update Password
                </Button>
              </div>

              <div className="pt-3 text-center">
                <Link
                  to="/login"
                  className="text-xs text-zinc-400 hover:text-white transition-colors font-medium"
                >
                  Cancel and return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
