// src/utils/jwt.ts
import jwt from 'jsonwebtoken';

// Validate that secrets are set
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    'FATAL ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables. ' +
    'Please check your .env file.'
  );
}

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long for security');
}

if (JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long for security');
}

export const generateToken = (userId: string, expiresIn = '15m'): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn } as any);
};

export const verifyToken = (token: string): string | jwt.JwtPayload => {
  return jwt.verify(token, JWT_SECRET);
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' } as any);
};

export const verifyRefreshToken = (token: string): string | jwt.JwtPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};