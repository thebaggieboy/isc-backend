// src/services/schedule.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ScheduleService {
  async createSchedule(userId: string, data: {
    title: string;
    amount: number;
    payoutAmount: number;
    scheduledDate: Date;
    recurrence?: string;
    autoPayout?: boolean;
  }) {
    const schedule = await prisma.schedule.create({
      data: {
        userId,
        title: data.title,
        amount: data.amount,
        payoutAmount: data.payoutAmount,
        scheduledDate: data.scheduledDate,
        recurrence: data.recurrence || 'once',
        status: 'locked',
        autoPayout: data.autoPayout || false,
      } as any,
    });

    // Update User Total Locked and Impulse Stats
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { totalLocked: { increment: data.amount } }
      }),
      prisma.impulseStats.upsert({
        where: { userId_month: { userId, month: currentMonth } },
        create: {
          userId,
          month: currentMonth,
          totalSaved: data.amount,
        },
        update: {
          totalSaved: { increment: data.amount }
        }
      })
    ]);

    return schedule;
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
      let isWithdrawal = false;
      let bankDetails = "";
      let title = "";
      let scheduleId = "";

      if (type === 'lock') {
        const lock = await tx.lockPeriod.findUnique({
          where: { id, userId }
        });

        if (!lock || lock.status === 'unlocked') {
          throw new Error('Lock not found or already unlocked');
        }

        amount = lock.amount.toNumber();
        payoutAmount = amount;
        title = lock.description || 'Lock Period';

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
        title = schedule.title;
        scheduleId = schedule.id;

        await tx.schedule.update({
          where: { id },
          data: {
            status: 'completed',
            executedAt: new Date()
          }
        });

        // ── Auto-generate next recurring schedule ──────────────
        const recurrenceRaw = schedule.recurrence?.toLowerCase() || '';
        const [freqStr, ...params] = recurrenceRaw.split(';');
        const freq = freqStr.trim();

        // Parse params for until date
        let untilDate: Date | null = null;
        const untilParam = params.find(p => p.startsWith('until='));
        if (untilParam) {
          untilDate = new Date(untilParam.split('=')[1]);
        }

        if (freq && freq !== 'once') {
          const currentDate = new Date(schedule.scheduledDate);
          const nextDate = this.calculateNextDate(currentDate, freq);

          // Check if nextDate is beyond untilDate
          if (untilDate && nextDate > untilDate) {
            // Stop recurrence
          } else {
            await tx.schedule.create({
              data: {
                userId,
                title: schedule.title,
                amount: schedule.amount,
                payoutAmount: schedule.payoutAmount,
                scheduledDate: nextDate,
                recurrence: schedule.recurrence, // Keep original recurrence string
                status: 'locked',
                autoPayout: schedule.autoPayout,
              } as any,
            });
          }
        }

        // ── Auto Payout Check ──────────
        if (schedule.autoPayout) {
          const defaultBank = await tx.bank.findFirst({
            where: { userId, isDefault: true }
          });

          if (defaultBank) {
            isWithdrawal = true;
            bankDetails = `${defaultBank.bankName} - ${defaultBank.accountNumber}`;
          } else {
            console.log(`AutoPayout requested for schedule ${id} but no default bank found. Unlocking to wallet.`);
          }
        }
      }

      // Update user balance
      const userUpdateData: any = {
        totalLocked: { decrement: amount }
      };

      // If NOT withdrawal (auto-payout to bank), add to available balance (Unlock)
      if (!isWithdrawal) {
        userUpdateData.balance = { increment: payoutAmount };
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: userUpdateData,
        select: { balance: true }
      });

      const balanceAfter = updatedUser.balance.toNumber();
      let balanceBefore = balanceAfter;

      if (!isWithdrawal) {
        balanceBefore = balanceAfter - payoutAmount;
      }

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: isWithdrawal ? 'withdrawal' : (type === 'lock' ? 'unlock' : 'payout'),
          amount: payoutAmount,
          balanceBefore,
          balanceAfter,
          status: 'completed',
          description: isWithdrawal
            ? `Auto Payout to ${bankDetails} - ${title}`
            : `Payout completed for ${type}${type === 'schedule' ? '' : ' lock'}`,
          completedAt: new Date(),
          metadata: isWithdrawal ? { bankDetails, scheduleId } : { scheduleId }
        }
      });

      return { success: true };
    });
  }

  /**
   * Calculate the next scheduled date based on recurrence frequency.
   */
  private calculateNextDate(currentDate: Date, recurrence: string): Date {
    const next = new Date(currentDate);

    switch (recurrence) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        // For any custom interval, default to weekly
        next.setDate(next.getDate() + 7);
        break;
    }

    return next;
  }
}
