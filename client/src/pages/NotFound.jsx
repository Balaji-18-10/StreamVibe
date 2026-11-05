import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl font-black text-brand-500 mb-4">404</h1>
        <p className="text-2xl font-bold text-white mb-2">Page not found</p>
        <p className="text-zinc-400 mb-8">The page you are looking for does not exist.</p>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    </div>
  );
}
