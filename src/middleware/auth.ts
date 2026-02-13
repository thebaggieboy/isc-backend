// src/middleware/auth.ts - WITH DETAILED LOGGING
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // DEBUG LOG 1
    logger.info('🔍 Auth Header:', authHeader?.substring(0, 50) + '...');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('❌ No bearer token in header');
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      logger.warn('❌ Token is empty after split');
      throw new AppError('No token provided', 401);
    }

    // DEBUG LOG 2
    logger.info('🎫 Token extracted:', token.substring(0, 20) + '...');
    logger.info('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);

    // First decode without verification to see what's inside
    const decodedRaw = jwt.decode(token);
    logger.info('📦 Raw decoded token:', JSON.stringify(decodedRaw));

    // Now verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // DEBUG LOG 3
    logger.info('✅ Token verified successfully');
    logger.info('📝 Decoded payload:', JSON.stringify(decoded));
    logger.info('🔍 Available fields:', Object.keys(decoded).join(', '));

    // Check what field exists (prioritize userId since that's what generateToken creates)
    if (decoded.userId) {
      logger.info('✅ Using decoded.userId:', decoded.userId);
      req.userId = decoded.userId;
    } else if (decoded.id) {
      logger.info('✅ Using decoded.id:', decoded.id);
      req.userId = decoded.id;
    } else {
      logger.error('❌ No id or userId field in token!');
      logger.error('Token payload:', decoded);
      throw new AppError('Invalid token structure', 401);
    }

    logger.info('✅ req.userId set to:', req.userId);
    next();
  } catch (error) {
    logger.error('❌ Auth error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      logger.error('JWT Error:', error.message);
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.error('Token expired at:', error.expiredAt);
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};