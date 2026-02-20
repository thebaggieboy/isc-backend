// src/services/user.service.ts
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';

const prisma = new PrismaClient();

export class UserService {
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        balance: true,
        totalLocked: true,
        isVerified: true,
        kycStatus: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async updateProfile(userId: string, data: { fullName?: string; phone?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.phone && { phone: data.phone }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        balance: true,
        totalLocked: true,
      },
    });

    return user;
  }

  async getBalance(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        totalLocked: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      balance: user.balance.toNumber(),
      totalLocked: user.totalLocked.toNumber(),
      available: user.balance.toNumber() - user.totalLocked.toNumber(),
    };
  }

  async getStats(userId: string) {
    // Get user balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        totalLocked: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get transaction counts
    const [depositCount, lockCount, transactionCount] = await Promise.all([
      prisma.transaction.count({
        where: { userId, type: 'deposit', status: 'completed' },
      }),
      prisma.lockPeriod.count({
        where: { userId },
      }),
      prisma.transaction.count({
        where: { userId, status: 'completed' },
      }),
    ]);

    // Get total deposited
    const deposits = await prisma.transaction.aggregate({
      where: { userId, type: 'deposit', status: 'completed' },
      _sum: { amount: true },
    });

    // Get current month impulse stats
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const impulseStats = await prisma.impulseStats.findUnique({
      where: {
        userId_month: {
          userId,
          month: currentMonth,
        },
      },
    });

    return {
      balance: user.balance.toNumber(),
      totalLocked: user.totalLocked.toNumber(),
      totalDeposited: deposits._sum.amount?.toNumber() || 0,
      depositCount,
      lockCount,
      transactionCount,
      // Flatten Impulse Stats for frontend compatibility
      savedThisMonth: impulseStats?.totalSaved.toNumber() || 0,
      impulsesStopped: impulseStats?.impulsesStopped || 0,
      currentStreak: impulseStats?.currentStreak || 0,
      savingsGoal: impulseStats?.savingsGoal?.toNumber() || 0, // Default 0 if no goal or no stats
      longestStreak: impulseStats?.longestStreak || 0,
    };
  }

  async updatePushToken(userId: string, token: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });
  }
}
