// src/routes/user.routes.ts
import express from 'express';
import { body } from 'express-validator';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = express.Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticate);

// Get current user
router.get('/me', userController.getCurrentUser);

// Update profile
router.put(
  '/me',
  [
    body('fullName').optional().trim().isLength({ min: 2 }),
    body('phone').optional().isMobilePhone('any'),
  ],
  validate,
  userController.updateProfile
);

// Get balance
router.get('/balance', userController.getBalance);

// Get stats
router.get('/stats', userController.getStats);

export default router;
