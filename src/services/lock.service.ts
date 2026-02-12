// src/services/lock.service.ts
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { emailService } from '../utils/email';

const prisma = new PrismaClient();

export class LockService {
  async createLock(userId: string, amount: number, intervalDays: number, description?: string) {
    const minLockAmount = Number(process.env.MIN_LOCK_AMOUNT) || 1000;
    if (amount < minLockAmount) {
      throw new AppError(`Minimum lock amount is ₦${minLockAmount.toLocaleString()}`, 400);
    }

    const maxLockDays = Number(process.env.MAX_LOCK_DAYS) || 365;
    if (intervalDays < 1 || intervalDays > maxLockDays) {
      throw new AppError(`Lock period must be between 1 and ${maxLockDays} days`, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.balance.toNumber() < amount) {
      throw new AppError('Insufficient balance', 400);
    }

    const lockDate = new Date();
    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + intervalDays);

    const result = await prisma.$transaction(async (tx) => {
      const lock = await tx.lockPeriod.create({
        data: {
          userId,
          amount,
          lockDate,
          unlockDate,
          intervalDays,
          description: description || `${intervalDays} Day Lock`,
          status: 'locked',
        },
      });

      const balanceBefore = user.balance.toNumber();
      const balanceAfter = balanceBefore - amount;

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: balanceAfter,
          totalLocked: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'lock',
          amount,
          balanceBefore,
          balanceAfter,
          status: 'completed',
          description: `Locked ₦${amount.toLocaleString()} for ${intervalDays} days`,
          completedAt: new Date(),
        },
      });

      return lock;
    });

    await emailService.sendLockNotification(user.email, amount, intervalDays, unlockDate);

    return result;
  }

  async getAllLocks(userId: string) {
    const locks = await prisma.lockPeriod.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return locks;
  }

  async getLockById(userId: string, lockId: string) {
    const lock = await prisma.lockPeriod.findFirst({
      where: {
        id: lockId,
        userId,
      },
    });

    if (!lock) {
      throw new AppError('Lock not found', 404);
    }

    return lock;
  }

  async getUpcomingUnlocks(userId: string) {
    const locks = await prisma.lockPeriod.findMany({
      where: {
        userId,
        status: 'locked',
      },
      orderBy: { unlockDate: 'asc' },
      take: 5,
    });

    return locks;
  }

  async unlockFunds(lockId: string) {
    const lock = await prisma.lockPeriod.findUnique({
      where: { id: lockId },
      include: { user: true },
    });

    if (!lock) {
      throw new AppError('Lock not found', 404);
    }

    if (lock.status !== 'locked') {
      throw new AppError('Lock already processed', 400);
    }

    const now = new Date();
    if (now < lock.unlockDate) {
      throw new AppError('Lock period not yet complete', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.lockPeriod.update({
        where: { id: lockId },
        data: {
          status: 'unlocked',
          actualUnlockDate: now,
        },
      });

      const balanceBefore = lock.user.balance.toNumber();
      const amount = lock.amount.toNumber();
      const balanceAfter = balanceBefore + amount;

      await tx.user.update({
        where: { id: lock.userId },
        data: {
          balance: balanceAfter,
          totalLocked: { decrement: amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId: lock.userId,
          type: 'unlock',
          amount,
          balanceBefore,
          balanceAfter,
          status: 'completed',
          description: `Unlocked ₦${amount.toLocaleString()} from ${lock.intervalDays}-day lock`,
          completedAt: now,
        },
      });

      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      await tx.impulseStats.upsert({
        where: {
          userId_month: {
            userId: lock.userId,
            month: currentMonth,
          },
        },
        create: {
          userId: lock.userId,
          month: currentMonth,
          totalSaved: amount,
          currentStreak: 1,
          longestStreak: 1,
        },
        update: {
          totalSaved: { increment: amount },
        },
      });
    });

    await emailService.sendUnlockNotification(lock.user.email, lock.amount.toNumber());

    return { message: 'Funds unlocked successfully' };
  }
}
