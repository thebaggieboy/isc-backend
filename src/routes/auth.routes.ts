// src/routes/auth.routes.ts
import express from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();
const authController = new AuthController();

// Register
router.post(
  '/register',
  rateLimiter(5, 15), // 5 requests per 15 minutes
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').trim().isLength({ min: 2 }),
    body('phone').optional().isMobilePhone('any'),
  ],
  validate,
  authController.register
);

// Login
router.post(
  '/login',
  rateLimiter(5, 15),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  authController.login
);

// Refresh token
router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  validate,
  authController.refresh
);

// Logout
router.post('/logout', authController.logout);

// Forgot password
router.post(
  '/forgot-password',
  rateLimiter(3, 15),
  [body('email').isEmail().normalizeEmail()],
  validate,
  authController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 }),
  ],
  validate,
  authController.resetPassword
);

// Verify email
router.get('/verify-email/:token', authController.verifyEmail);

export default router;
