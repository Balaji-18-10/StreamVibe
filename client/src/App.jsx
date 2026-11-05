import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import MainLayout from '@components/layout/MainLayout.jsx';
import PageLoader from '@components/ui/PageLoader.jsx';
import ErrorBoundary from '@components/ui/ErrorBoundary.jsx';
import ProtectedRoute from '@components/auth/ProtectedRoute.jsx';
import PublicOnlyRoute from '@components/auth/PublicOnlyRoute.jsx';
import { useAuthStore } from '@store/authStore.js';

// Pages — lazy loaded
const Home = lazy(() => import('@pages/Home.jsx'));
const Watch = lazy(() => import('@pages/Watch.jsx'));
const Shorts = lazy(() => import('@pages/Shorts.jsx'));
const Search = lazy(() => import('@pages/Search.jsx'));
const Channel = lazy(() => import('@pages/Channel.jsx'));
const Subscriptions = lazy(() => import('@pages/Subscriptions.jsx'));
const Library = lazy(() => import('@pages/Library.jsx'));
const History = lazy(() => import('@pages/History.jsx'));
const Playlists = lazy(() => import('@pages/Playlists.jsx'));
const PlaylistDetail = lazy(() => import('@pages/PlaylistDetail.jsx'));
const CreatorStudio = lazy(() => import('@pages/CreatorStudio.jsx'));
const Upload = lazy(() => import('@pages/Upload.jsx'));
const Settings = lazy(() => import('@pages/Settings.jsx'));
const AdminDashboard = lazy(() => import('@pages/AdminDashboard.jsx'));
const Login = lazy(() => import('@pages/auth/Login.jsx'));
const Register = lazy(() => import('@pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('@pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('@pages/auth/ResetPassword.jsx'));
const NotFound = lazy(() => import('@pages/NotFound.jsx'));

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public-only Auth pages (redirect to / if already logged in) */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Route>

          {/* Main app layout */}
          <Route element={<MainLayout />}>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/watch/:videoId" element={<Watch />} />
            <Route path="/shorts" element={<Shorts />} />
            <Route path="/shorts/:videoId" element={<Shorts />} />
            <Route path="/search" element={<Search />} />
            <Route path="/@:username" element={<Channel />} />
            <Route path="/playlists/:playlistId" element={<PlaylistDetail />} />

            {/* Protected routes (require authenticated session) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/library" element={<Library />} />
              <Route path="/history" element={<History />} />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/studio" element={<CreatorStudio />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Admin only route */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </ErrorBoundary>
  );
}

export default App;
