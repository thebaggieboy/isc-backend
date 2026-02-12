// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { catchAsync } from '../utils/catchAsync';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = catchAsync(async (req: Request, res: Response) => {
    const { email, password, fullName, phone } = req.body;

    const result = await this.authService.register({
      email,
      password,
      fullName,
      phone,
    });

    res.status(201).json({
      status: 'success',
      message: 'Registration successful',
      data: result,
    });
  });

  login = catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await this.authService.login(email, password);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: result,
    });
  });

  refresh = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const result = await this.authService.refreshToken(refreshToken);

    res.json({
      status: 'success',
      data: result,
    });
  });

  logout = catchAsync(async (_req: Request, res: Response) => {
    res.json({
      status: 'success',
      message: 'Logout successful',
    });
  });

  forgotPassword = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;

    await this.authService.forgotPassword(email);

    res.json({
      status: 'success',
      message: 'Password reset email sent',
    });
  });

  resetPassword = catchAsync(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    await this.authService.resetPassword(token, password);

    res.json({
      status: 'success',
      message: 'Password reset successful',
    });
  });

  verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const { token } = req.params;

    await this.authService.verifyEmail(token);

    res.json({
      status: 'success',
      message: 'Email verified successfully',
    });
  });
}
