import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';

/**
 * ProtectedRoute — guards routes requiring authentication.
 * Redirects unauthenticated users to /login?redirect=<target>
 */
export default function ProtectedRoute({ requireAdmin = false }) {
  const location = useLocation();
  const { user, isAuthenticated, isCheckingAuth, checkAuth } = useAuthStore();

  useEffect(() => {
    // If not authenticated and not currently checking, verify with backend session
    if (!isAuthenticated) {
      checkAuth?.();
    }
  }, [isAuthenticated, checkAuth]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Verifying authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectUrl = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectUrl)}`} replace />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
