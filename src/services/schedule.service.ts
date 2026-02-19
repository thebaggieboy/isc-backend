// src/services/schedule.service.ts
import { PrismaClient } from '@prisma/client';
// import { AppError } from '../utils/AppError'; // Unused

const prisma = new PrismaClient();

export class ScheduleService {
  async createSchedule(userId: string, data: {
    title: string;
    amount: number;
    payoutAmount: number;
    scheduledDate: Date;
    recurrence?: string;
  }) {
    return await prisma.schedule.create({
      data: {
        userId,
        title: data.title,
        amount: data.amount,
        payoutAmount: data.payoutAmount, // Ensure schema has this field
        scheduledDate: data.scheduledDate,
        recurrence: data.recurrence || 'once',
        status: 'locked',
      } as any, // Cast to any to bypass type check if schema is outdated in current context
    });
  }

  async getUserSchedules(userId: string) {
    return await prisma.schedule.findMany({
      where: { userId },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async getUserPayouts(userId: string) {
    // Get both locked funds (which become payouts) and active schedules (pending or completed)
    const [locks, schedules] = await Promise.all([
      prisma.lockPeriod.findMany({
        where: { userId },
        orderBy: { unlockDate: 'asc' },
      }),
      prisma.schedule.findMany({
        where: {
          userId,
          status: { in: ['completed', 'pending', 'locked'] } // Include locked and pending schedules
        },
        orderBy: { scheduledDate: 'asc' }, // Order by date ascending for upcoming
      }),
    ]);

    // Map locks to payout structure
    const lockPayouts = locks.map(lock => ({
      id: lock.id,
      amount: lock.amount.toNumber(),
      lockDate: lock.lockDate,
      unlockDate: lock.unlockDate, // This is the payout date
      status: lock.status,
      interval: `${lock.intervalDays} Day Lock`,
      recurrence: `${lock.intervalDays} Day Lock`, // Explicit recurrence for locks
      title: lock.description || 'Lock Period', // Use description or default
      type: 'lock'
    }));

    // Map schedules to payout structure
    const schedulePayouts = schedules.map(schedule => ({
      id: schedule.id,
      amount: schedule.payoutAmount.toNumber(),
      lockDate: schedule.scheduledDate, // Or execution date
      unlockDate: schedule.scheduledDate, // Immediate payout?
      status: schedule.status, // Pass through status ('locked', 'pending', 'completed')
      interval: schedule.recurrence || 'Once', // Use recurrence for interval backward compat
      recurrence: schedule.recurrence || 'Once',
      title: schedule.title || 'Scheduled Withdrawal',
      type: 'schedule'
    }));

    // Return combined list sorted by unlock/scheduled date
    return [...lockPayouts, ...schedulePayouts].sort((a, b) => {
      const dateA = new Date(a.unlockDate).getTime();
      const dateB = new Date(b.unlockDate).getTime();
      return dateA - dateB;
    });
  }

  async completePayout(userId: string, id: string, type: 'lock' | 'schedule') {
    return await prisma.$transaction(async (tx) => {
      let amount = 0;
      let payoutAmount = 0;

      if (type === 'lock') {
        const lock = await tx.lockPeriod.findUnique({
          where: { id, userId }
        });

        if (!lock || lock.status === 'unlocked') {
          throw new Error('Lock not found or already unlocked');
        }

        amount = lock.amount.toNumber();
        payoutAmount = amount; // For locks, payout is usually the whole amount

        await tx.lockPeriod.update({
          where: { id },
          data: {
            status: 'unlocked',
            actualUnlockDate: new Date()
          }
        });
      } else {
        const schedule = await tx.schedule.findUnique({
          where: { id, userId }
        });

        if (!schedule || schedule.status === 'completed') {
          throw new Error('Schedule not found or already completed');
        }

        amount = schedule.amount.toNumber();
        payoutAmount = schedule.payoutAmount.toNumber();

        await tx.schedule.update({
          where: { id },
          data: {
            status: 'completed',
            executedAt: new Date()
          }
        });
      }

      // Update user balance
      // We add the payoutAmount to the accessible balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: payoutAmount },
          // If the amount was in totalLocked, we should decrement it
          totalLocked: { decrement: amount }
        },
        select: { balance: true }
      });

      const balanceAfter = updatedUser.balance.toNumber();
      const balanceBefore = balanceAfter - payoutAmount;

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: type === 'lock' ? 'unlock' : 'payout',
          amount: payoutAmount,
          balanceBefore,
          balanceAfter,
          status: 'completed',
          description: `Payout completed for ${type}${type === 'schedule' ? '' : ' lock'}`,
          completedAt: new Date()
        }
      });

      return { success: true };
    });
  }
}
