
import { PrismaClient } from '@prisma/client';
import { ScheduleService } from '../services/schedule.service';

const prisma = new PrismaClient();
const scheduleService = new ScheduleService();

export class PayoutJob {
    /**
     * Process all due schedules that are marked for Auto Payout.
     */
    async processDuePayouts() {
        console.log('Running Payout Job...');

        // Find all schedules that:
        // 1. Are 'locked' or 'pending'
        // 2. Have autoPayout = true
        // 3. scheduledDate <= Now
        const dueSchedules = await prisma.schedule.findMany({
            where: {
                status: { in: ['locked', 'pending'] },
                autoPayout: true,
                scheduledDate: { lte: new Date() }
            }
        });

        console.log(`Found ${dueSchedules.length} due auto-payouts.`);

        const results = {
            success: 0,
            failed: 0,
            errors: [] as any[]
        };

        for (const schedule of dueSchedules) {
            try {
                console.log(`Processing schedule ${schedule.id}...`);
                // We use completePayout which now handles withdrawal logic
                await scheduleService.completePayout(schedule.userId, schedule.id, 'schedule');
                results.success++;
            } catch (error) {
                console.error(`Failed to process schedule ${schedule.id}:`, error);
                results.failed++;
                results.errors.push({ id: schedule.id, error });
            }
        }

        return results;
    }
}

export const payoutJob = new PayoutJob();
