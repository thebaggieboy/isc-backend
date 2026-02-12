// src/controllers/schedule.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ScheduleService } from '../services/schedule.service';
import { catchAsync } from '../utils/catchAsync';

export class ScheduleController {
  private scheduleService: ScheduleService;

  constructor() {
    this.scheduleService = new ScheduleService();
  }

  createSchedule = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { title, amount, scheduledDate, recurrence } = req.body;

    const schedule = await this.scheduleService.createSchedule(userId, {
      title,
      amount,
      scheduledDate: new Date(scheduledDate),
      recurrence,
    });

    res.status(201).json({
      status: 'success',
      message: 'Schedule created successfully',
      data: { schedule },
    });
  });

  getAllSchedules = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const schedules = await this.scheduleService.getAllSchedules(userId);

    res.json({
      status: 'success',
      data: { schedules },
    });
  });

  getScheduleById = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    const schedule = await this.scheduleService.getScheduleById(userId, id);

    res.json({
      status: 'success',
      data: { schedule },
    });
  });

  updateSchedule = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { title, amount, scheduledDate, recurrence } = req.body;

    const schedule = await this.scheduleService.updateSchedule(userId, id, {
      title,
      amount,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      recurrence,
    });

    res.json({
      status: 'success',
      message: 'Schedule updated successfully',
      data: { schedule },
    });
  });

  deleteSchedule = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    await this.scheduleService.deleteSchedule(userId, id);

    res.json({
      status: 'success',
      message: 'Schedule deleted successfully',
    });
  });
}
