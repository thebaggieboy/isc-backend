// src/controllers/schedule.controller.ts
import { Request, Response } from 'express';
import { ScheduleService } from '../services/schedule.service';
import { catchAsync } from '../utils/catchAsync';

interface AuthRequest extends Request {
  userId?: string;
}

export class ScheduleController {
  private scheduleService: ScheduleService;

  constructor() {
    this.scheduleService = new ScheduleService();
  }

  createSchedule = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { title, amount, payoutAmount, scheduledDate, recurrence } = req.body;

    const schedule = await this.scheduleService.createSchedule(userId, {
      title,
      amount,
      payoutAmount,
      scheduledDate: new Date(scheduledDate),
      recurrence,
    });

    res.status(201).json({
      status: 'success',
      data: { schedule },
    });
  });

  getSchedules = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const schedules = await this.scheduleService.getUserSchedules(userId);

    res.json({
      status: 'success',
      data: { schedules },
    });
  });

  getPayouts = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const payouts = await this.scheduleService.getUserPayouts(userId);

    res.json({
      status: 'success',
      data: { payouts },
    });
  });
}
