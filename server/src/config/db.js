import 'dotenv/config';
import dns from 'dns';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const DB_NAME = 'youtube_clone';

// Configure reliable DNS servers to prevent Windows querySrv ECONNREFUSED with Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Use system default if setting custom DNS servers is not allowed
}

/**
 * Normalizes MongoDB URI by stripping unintentional placeholder brackets < > from credentials.
 */
export const normalizeMongoUri = (rawUri) => {
  if (!rawUri || typeof rawUri !== 'string') return '';
  const match = rawUri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/i);
  if (!match) return rawUri;

  const [, protocol, userPart, passPart, hostPart] = match;
  let user = userPart;
  let pass = passPart;

  // Strip leading/trailing < > if user preserved Atlas template brackets
  if (user.startsWith('<') && user.endsWith('>')) user = user.slice(1, -1);
  if (pass.startsWith('<') && pass.endsWith('>')) pass = pass.slice(1, -1);

  return `${protocol}${encodeURIComponent(decodeURIComponent(user))}:${encodeURIComponent(decodeURIComponent(pass))}@${hostPart}`;
};

/**
 * Sanitize error message to prevent logging credentials.
 */
const sanitizeError = (err) => {
  if (!err) return '';
  const msg = err.message || String(err);
  return msg.replace(/mongodb(\+srv)?:\/\/[^\s@]+@[^\s/]+/gi, 'mongodb$1://***:***@<host>');
};

/**
 * Sanitize MongoDB host string for safe logging.
 */
const sanitizeHost = (host) => {
  if (!host) return 'unknown';
  return String(host).replace(/[^\w.-]/g, '');
};

// Track whether connection events have already been registered
let eventsRegistered = false;

const registerConnectionEvents = () => {
  if (eventsRegistered) return;
  eventsRegistered = true;

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Waiting for reconnection...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection event error:', sanitizeError(err));
  });
};

/**
 * Connect to MongoDB Atlas.
 * Enforces database name 'youtube_clone' and safe pooling settings.
 */
export const connectDB = async () => {
  const rawUri = process.env.MONGODB_URI;

  if (!rawUri || rawUri === 'YOUR_MONGODB_CONNECTION_STRING' || rawUri.includes('<user>') || rawUri.includes('xxxxx')) {
    const errorMsg = 'Invalid or unconfigured MONGODB_URI in server/.env (placeholder detected).';
    logger.error(`MongoDB connection aborted: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const uri = normalizeMongoUri(rawUri);

  try {
    registerConnectionEvents();

    const conn = await mongoose.connect(uri, {
      dbName: DB_NAME,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    const host = sanitizeHost(conn.connection.host);
    const dbName = conn.connection.name;
    logger.info(`✅ MongoDB connected successfully to database "${dbName}" on host "${host}"`);

    return conn;
  } catch (error) {
    logger.error('MongoDB connection error:', sanitizeError(error));
    throw error;
  }
};

/**
 * Gracefully close the MongoDB connection.
 */
export const closeDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      logger.info('MongoDB connection closed gracefully');
    }
  } catch (err) {
    logger.error('Error closing MongoDB connection:', sanitizeError(err));
  }
};

/**
 * Get current database connection status (safe for health check, no secrets).
 */
export const getDBStatus = () => {
  const readyState = mongoose.connection.readyState;
  const stateLabels = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    isConnected: readyState === 1,
    readyState,
    status: stateLabels[readyState] || 'unknown',
    name: readyState === 1 ? mongoose.connection.name : DB_NAME,
    host: readyState === 1 ? sanitizeHost(mongoose.connection.host) : null,
  };
};
