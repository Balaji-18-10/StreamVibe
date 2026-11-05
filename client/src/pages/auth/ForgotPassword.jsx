import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Mail, AlertCircle, ArrowLeft, CheckCircle2, KeyRound, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import Button from '../../components/ui/Button.jsx';

export default function ForgotPassword() {
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setValidationError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    const res = await forgotPassword(cleanEmail);
    if (res.success) {
      setSuccessInfo({
        email: cleanEmail,
        message: res.message,
        resetToken: res.data?.resetToken,
        resetUrl: res.data?.resetUrl,
      });
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset your password</h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Enter your email to receive recovery instructions
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#17171D] border border-[#23232C] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-sm">
          {successInfo ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Check your inbox</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  If an account is associated with{' '}
                  <span className="text-zinc-200 font-semibold">{successInfo.email}</span>, we have
                  sent password reset instructions.
                </p>
              </div>

              {/* Development helper link when available */}
              {successInfo.resetToken && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                    <KeyRound className="w-4 h-4" />
                    <span>Development Direct Link</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-2.5">
                    Reset token generated for testing:
                  </p>
                  <Link
                    to={`/reset-password/${successInfo.resetToken}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF3038] hover:text-[#ff4f56] underline"
                  >
                    <span>Proceed to Reset Password</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <Button
                  to="/login"
                  variant="outline"
                  size="md"
                  leftIcon={ArrowLeft}
                  className="w-full justify-center"
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Banner */}
              {displayError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed font-medium">{displayError}</p>
                </div>
              )}

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
                    autoComplete="email"
                    placeholder="name@example.com"
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

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="w-full justify-center shadow-lg shadow-[#FF3038]/25"
                >
                  Send Reset Link
                </Button>
              </div>

              <div className="pt-3 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
