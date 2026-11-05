import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import videoRoutes from './routes/video.routes.js';
import commentRoutes from './routes/comment.routes.js';
import likeRoutes from './routes/like.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import playlistRoutes from './routes/playlist.routes.js';
import searchRoutes from './routes/search.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import reportRoutes from './routes/report.routes.js';
import adminRoutes from './routes/admin.routes.js';

// Middleware imports
import { errorHandler } from './middleware/error.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';
import { getDBStatus } from './config/db.js';

const app = express();

// ─── Security Middleware ──────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile, server-to-server, curl)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');
    const isLocalhost = process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin);
    const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);

    if (isExplicitlyAllowed || isLocalhost || isVercelPreview) {
      return callback(null, true);
    }
    return callback(new Error(`CORS Error: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(mongoSanitize()); // Prevent MongoDB injection

// ─── Rate Limiting ────────────────────────────────────────
// General API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', generalLimiter);

// Strict Rate Limiter for Authentication endpoints (prevent brute-force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);

// ─── General Middleware ───────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const db = getDBStatus();
  const statusCode = db.isConnected ? 200 : 503;

  res.status(statusCode).json({
    success: db.isConnected,
    message: db.isConnected
      ? 'StreamVibe API & Database are healthy 🎬'
      : 'StreamVibe API is running, but database is disconnected',
    database: {
      status: db.status,
      name: db.name,
      host: db.host,
      readyState: db.readyState,
    },
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/likes', likeRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/playlists', playlistRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── Error Handling ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
