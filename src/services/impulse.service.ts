// src/services/impulse.service.ts
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';

const prisma = new PrismaClient();

export class ImpulseService {
  async getStats(userId: string) {
    // Get current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // Get or create stats for current month
    const stats = await prisma.impulseStats.findUnique({
      where: {
        userId_month: {
          userId,
          month: currentMonth,
        },
      },
    });

    if (!stats) {
      // Create stats for current month
      const newStats = await prisma.impulseStats.create({
        data: {
          userId,
          month: currentMonth,
          savingsGoal: 500000, // Default goal
        },
      });
      return newStats;
    }

    return stats;
  }

  async trackImpulseStopped(userId: string) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const stats = await prisma.impulseStats.upsert({
      where: {
        userId_month: {
          userId,
          month: currentMonth,
        },
      },
      create: {
        userId,
        month: currentMonth,
        impulsesStopped: 1,
        currentStreak: 1,
        longestStreak: 1,
        savingsGoal: 500000,
      },
      update: {
        impulsesStopped: { increment: 1 },
        currentStreak: { increment: 1 },
      },
    });

    // Update longest streak if current streak is higher
    if (stats.currentStreak > stats.longestStreak) {
      await prisma.impulseStats.update({
        where: { id: stats.id },
        data: { longestStreak: stats.currentStreak },
      });
    }

    return await this.getStats(userId);
  }

  async getCurrentStreak(userId: string) {
    const stats = await this.getStats(userId);

    return {
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      impulsesStopped: stats.impulsesStopped,
    };
  }

  async setSavingsGoal(userId: string, amount: number) {
    if (amount < 1000) {
      throw new AppError('Minimum savings goal is ₦1,000', 400);
    }

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const stats = await prisma.impulseStats.upsert({
      where: {
        userId_month: {
          userId,
          month: currentMonth,
        },
      },
      create: {
        userId,
        month: currentMonth,
        savingsGoal: amount,
      },
      update: {
        savingsGoal: amount,
      },
    });

    return stats;
  }
}
