// src/jobs/index.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { LockService } from '../services/lock.service';

const prisma = new PrismaClient();
const lockService = new LockService();

export const initializeCronJobs = () => {
  // Run every hour to check for locks ready to unlock
  cron.schedule('0 * * * *', async () => {
    logger.info('⏰ Running automated unlock job...');

    try {
      const now = new Date();

      // Find all locks ready to unlock
      const readyLocks = await prisma.lockPeriod.findMany({
        where: {
          status: 'locked',
          unlockDate: {
            lte: now,
          },
        },
      });

      logger.info(`Found ${readyLocks.length} locks ready to unlock`);

      // Process each lock
      for (const lock of readyLocks) {
        try {
          await lockService.unlockFunds(lock.id);
          logger.info(`✅ Unlocked funds for lock ${lock.id}`);
        } catch (error) {
          logger.error(`❌ Failed to unlock lock ${lock.id}:`, error);
        }
      }

      logger.info('✅ Automated unlock job completed');
    } catch (error) {
      logger.error('❌ Automated unlock job failed:', error);
    }
  });

  // Update streak every day at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('⏰ Running daily streak update...');

    try {
      const users = await prisma.user.findMany({
        include: {
          impulseStats: {
            orderBy: { month: 'desc' },
            take: 1,
          },
        },
      });

      for (const user of users) {
        // Logic to update streaks based on user activity
        // This is simplified - you'd implement your own streak logic
        logger.info(`Updated streak for user ${user.id}`);
      }

      logger.info('✅ Daily streak update completed');
    } catch (error) {
      logger.error('❌ Daily streak update failed:', error);
    }
  });

  logger.info('✅ Cron jobs scheduled');
};
