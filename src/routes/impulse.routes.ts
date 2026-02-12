// src/routes/impulse.routes.ts
import express from 'express';
import { body } from 'express-validator';
import { ImpulseController } from '../controllers/impulse.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = express.Router();
const impulseController = new ImpulseController();

// All routes require authentication
router.use(authenticate);

// Get impulse stats
router.get('/stats', impulseController.getStats);

// Track impulse stopped
router.post('/track', impulseController.trackImpulse);

// Get current streak
router.get('/streak', impulseController.getStreak);

// Set savings goal
router.put(
  '/goal',
  [body('amount').isFloat({ min: 1000 })],
  validate,
  impulseController.setSavingsGoal
);

export default router;
