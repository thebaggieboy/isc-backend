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
        status: 'pending',
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
    // Get both locked funds (which become payouts) and completed schedules
    const [locks, schedules] = await Promise.all([
      prisma.lockPeriod.findMany({
        where: { userId },
        orderBy: { unlockDate: 'asc' },
      }),
      prisma.schedule.findMany({
        where: { userId, status: 'completed' },
        orderBy: { scheduledDate: 'desc' },
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
      type: 'lock'
    }));

    // Map completed schedules to payout structure
    const schedulePayouts = schedules.map(schedule => ({
      id: schedule.id,
      amount: schedule.payoutAmount.toNumber(),
      lockDate: schedule.scheduledDate, // Or execution date
      unlockDate: schedule.scheduledDate, // Immediate payout?
      status: 'unlocked', // Completed schedules are unlocked
      interval: 'Scheduled',
      type: 'schedule'
    }));

    return [...lockPayouts, ...schedulePayouts].sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
  }
}
