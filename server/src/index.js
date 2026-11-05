import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { connectDB, closeDB } from './config/db.js';
import { initSocket } from './config/socket.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;
let httpServer;

// Connect to MongoDB then start server
connectDB()
  .then(() => {
    httpServer = createServer(app);

    // Attach Socket.IO to the HTTP server
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`📡 Socket.IO ready`);
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to MongoDB:', err.message || err);
    process.exit(1);
  });

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (httpServer) {
    httpServer.close(async () => {
      logger.info('HTTP server closed');
      await closeDB();
      process.exit(0);
    });
    // Force shutdown if cleanup takes longer than 10 seconds
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10000).unref();
  } else {
    await closeDB();
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err?.stack || err?.message || err}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err?.stack || err?.message || err}`);
  process.exit(1);
});
