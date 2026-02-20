// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { catchAsync } from '../utils/catchAsync';

interface AuthRequest extends Request {
  userId?: string;
}

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getCurrentUser = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const user = await this.userService.getUserById(userId);

    res.json({
      status: 'success',
      data: { user },
    });
  });

  updateProfile = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { fullName, phone } = req.body;

    const user = await this.userService.updateProfile(userId, {
      fullName,
      phone,
    });

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user },
    });
  });

  getBalance = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const balance = await this.userService.getBalance(userId);

    res.json({
      status: 'success',
      data: balance,
    });
  });

  getStats = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const stats = await this.userService.getStats(userId);

    res.json({
      status: 'success',
      data: stats,
    });
  });
  updatePushToken = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ status: 'fail', message: 'Token is required' });
      return;
    }

    await this.userService.updatePushToken(userId, token);

    res.json({
      status: 'success',
      message: 'Push token updated successfully',
    });
  });
}
