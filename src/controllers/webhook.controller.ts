
import { Request, Response } from 'express';
import { payoutJob } from '../jobs/payout.job';
import { catchAsync } from '../utils/catchAsync';

export class WebhookController {

    /**
     * Trigger the Auto Payout simulation manually.
     * POST /webhooks/simulate-payouts
     */
    simulatePayouts = catchAsync(async (_req: Request, res: Response) => {
        const results = await payoutJob.processDuePayouts();

        res.json({
            status: 'success',
            message: 'Payout simulation completed',
            results
        });
    });
}
