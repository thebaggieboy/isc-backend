// src/routes/schedule.routes.ts
import express from 'express';
import { body, param } from 'express-validator';
import { ScheduleController } from '../controllers/schedule.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = express.Router();
const scheduleController = new ScheduleController();

// All routes require authentication
router.use(authenticate);

// Create schedule
router.post(
  '/',
  [
    body('title').trim().isLength({ min: 2 }),
    body('amount').isFloat({ min: 1000 }),
    body('scheduledDate').isISO8601(),
    body('recurrence').optional().isIn(['once', 'daily', 'weekly', 'monthly']),
  ],
  validate,
  scheduleController.createSchedule
);

// Get all schedules
router.get('/', scheduleController.getAllSchedules);

// Get schedule by ID
router.get('/:id', param('id').isUUID(), validate, scheduleController.getScheduleById);

// Update schedule
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 2 }),
    body('amount').optional().isFloat({ min: 1000 }),
    body('scheduledDate').optional().isISO8601(),
  ],
  validate,
  scheduleController.updateSchedule
);

// Delete schedule
router.delete('/:id', param('id').isUUID(), validate, scheduleController.deleteSchedule);

export default router;
