// src/server.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import routes from './routes';
import { logger } from './utils/logger';
import { initializeCronJobs } from './jobs';
import { redisClient } from './config/redis';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { 
  stream: { write: (message) => logger.info(message.trim()) } 
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: API_VERSION
  });
});

// API Routes
app.use(`/api/${API_VERSION}`, routes);

// 404 Handler
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`🚀 ISC Backend running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 API: http://localhost:${PORT}/api/${API_VERSION}`);
  logger.info(`💚 Health: http://localhost:${PORT}/health`);
  
  // Initialize Redis (optional)
  try {
    await redisClient.connect();
    await redisClient.ping();
    logger.info('✅ Redis connected');
  } catch (error) {
    logger.warn('⚠️  Redis connection failed (continuing without cache)');
  }
  
  // Initialize cron jobs
  initializeCronJobs();
  logger.info('⏰ Cron jobs initialized');
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received: closing HTTP server`);
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis:', error);
    }
    
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;