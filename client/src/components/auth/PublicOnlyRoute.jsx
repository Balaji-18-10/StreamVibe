import React from 'react';
import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';

/**
 * PublicOnlyRoute — for login, register, forgot-password, reset-password.
 * Redirects already authenticated users to redirect query param or home.
 */
export default function PublicOnlyRoute() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (isAuthenticated) {
    const redirectParam = searchParams.get('redirect');
    const destination = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
