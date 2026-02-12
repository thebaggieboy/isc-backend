// src/controllers/impulse.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ImpulseService } from '../services/impulse.service';
import { catchAsync } from '../utils/catchAsync';

export class ImpulseController {
  private impulseService: ImpulseService;

  constructor() {
    this.impulseService = new ImpulseService();
  }

  getStats = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const stats = await this.impulseService.getStats(userId);

    res.json({
      status: 'success',
      data: { stats },
    });
  });

  trackImpulse = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const stats = await this.impulseService.trackImpulseStopped(userId); // Changed here

    res.json({
      status: 'success',
      message: 'Impulse tracked successfully',
      data: { stats },
    });
  });

  getStreak = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const streak = await this.impulseService.getCurrentStreak(userId); // Changed here

    res.json({
      status: 'success',
      data: streak,
    });
  });

  setSavingsGoal = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { amount } = req.body;

    const stats = await this.impulseService.setSavingsGoal(userId, amount);

    res.json({
      status: 'success',
      message: 'Savings goal updated successfully',
      data: { stats },
    });
  });
}