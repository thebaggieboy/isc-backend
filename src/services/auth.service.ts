// src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { generateToken, verifyToken } from '../utils/jwt';
import { emailService } from '../utils/email';

const prisma = new PrismaClient();

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export class AuthService {
  async register(data: RegisterData) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        balance: true,
        totalLocked: true,
        createdAt: true,
      },
    });

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    await prisma.impulseStats.create({
      data: {
        userId: user.id,
        month: currentMonth,
        savingsGoal: 500000,
      },
    });

    const accessToken = generateToken(user.id);
    const refreshToken = generateToken(user.id, '7d');

    await emailService.sendWelcomeEmail(user.email, user.fullName);

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const accessToken = generateToken(user.id);
    const refreshToken = generateToken(user.id, '7d');

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = verifyToken(refreshToken) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          balance: true,
          totalLocked: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const newAccessToken = generateToken(user.id);
      const newRefreshToken = generateToken(user.id, '7d');

      return {
        user,
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return;
    }

    const resetToken = generateToken(user.id, '1h');
    await emailService.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const decoded = verifyToken(token) as { userId: string };
      const passwordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: decoded.userId },
        data: { passwordHash },
      });
    } catch (error) {
      throw new AppError('Invalid or expired reset token', 400);
    }
  }

  async verifyEmail(token: string) {
    try {
      const decoded = verifyToken(token) as { userId: string };

      await prisma.user.update({
        where: { id: decoded.userId },
        data: { isVerified: true },
      });
    } catch (error) {
      throw new AppError('Invalid or expired verification token', 400);
    }
  }
}