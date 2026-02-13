// src/routes/schedule.routes.ts
import express from 'express';
import { ScheduleController } from '../controllers/schedule.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const scheduleController = new ScheduleController();

router.use(authenticate);

router.post('/', scheduleController.createSchedule);
router.get('/', scheduleController.getSchedules);
router.get('/payouts', scheduleController.getPayouts);

export default router;
