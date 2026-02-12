// src/routes/lock.routes.ts
import express from 'express';
import { body, param } from 'express-validator';
import { LockController } from '../controllers/lock.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = express.Router();
const lockController = new LockController();

// All routes require authentication
router.use(authenticate);

// Create lock
router.post(
  '/',
  [
    body('amount').isFloat({ min: 1000 }),
    body('intervalDays').isInt({ min: 1, max: 365 }),
    body('description').optional().trim(),
  ],
  validate,
  lockController.createLock
);

// Get all locks
router.get('/', lockController.getAllLocks);

// Get upcoming unlocks
router.get('/upcoming', lockController.getUpcomingUnlocks);

// Get lock by ID
router.get('/:id', param('id').isUUID(), validate, lockController.getLockById);

export default router;
