// src/controllers/lock.controller.ts
import { Request, Response } from 'express';
import { LockService } from '../services/lock.service';
import { catchAsync } from '../utils/catchAsync';

interface AuthRequest extends Request {
  userId?: string;
}

export class LockController {
  private lockService: LockService;

  constructor() {
    this.lockService = new LockService();
  }

  createLock = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { amount, intervalDays, description } = req.body;

    const lock = await this.lockService.createLock(
      userId,
      amount,
      intervalDays,
      description
    );

    res.status(201).json({
      status: 'success',
      message: 'Lock created successfully',
      data: { lock },
    });
  });

  getAllLocks = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const locks = await this.lockService.getAllLocks(userId);

    res.json({
      status: 'success',
      data: { locks, count: locks.length },
    });
  });

  getLockById = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    const lock = await this.lockService.getLockById(userId, id);

    res.json({
      status: 'success',
      data: { lock },
    });
  });

  getUpcomingUnlocks = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const locks = await this.lockService.getUpcomingUnlocks(userId);

    res.json({
      status: 'success',
      data: { locks, count: locks.length },
    });
  });
}
