// src/services/schedule.service.ts
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';

const prisma = new PrismaClient();

interface CreateScheduleData {
  title: string;
  amount: number;
  scheduledDate: Date;
  recurrence?: string;
}

export class ScheduleService {
  async createSchedule(userId: string, data: CreateScheduleData) {
    // Validate scheduled date is in the future
    const now = new Date();
    if (data.scheduledDate <= now) {
      throw new AppError('Scheduled date must be in the future', 400);
    }

    const schedule = await prisma.schedule.create({
      data: {
        userId,
        title: data.title,
        amount: data.amount,
        scheduledDate: data.scheduledDate,
        recurrence: data.recurrence || 'once',
        status: 'pending',
      },
    });

    return schedule;
  }

  async getAllSchedules(userId: string) {
    const schedules = await prisma.schedule.findMany({
      where: { userId },
      orderBy: { scheduledDate: 'asc' },
    });

    return schedules;
  }

  async getScheduleById(userId: string, scheduleId: string) {
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId,
      },
    });

    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    return schedule;
  }

  async updateSchedule(
    userId: string,
    scheduleId: string,
    updates: Partial<CreateScheduleData>
  ) {
    // Check if schedule exists and belongs to user
    const existingSchedule = await this.getScheduleById(userId, scheduleId);

    if (existingSchedule.status === 'completed') {
      throw new AppError('Cannot update completed schedule', 400);
    }

    // Validate scheduled date if being updated
    if (updates.scheduledDate) {
      const now = new Date();
      if (updates.scheduledDate <= now) {
        throw new AppError('Scheduled date must be in the future', 400);
      }
    }

    const schedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.amount && { amount: updates.amount }),
        ...(updates.scheduledDate && { scheduledDate: updates.scheduledDate }),
        ...(updates.recurrence && { recurrence: updates.recurrence }),
      },
    });

    return schedule;
  }

  async deleteSchedule(userId: string, scheduleId: string) {
    // Check if schedule exists and belongs to user
    await this.getScheduleById(userId, scheduleId);

    await prisma.schedule.delete({
      where: { id: scheduleId },
    });

    return { message: 'Schedule deleted successfully' };
  }
}
