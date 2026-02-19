// src/controllers/kyc.controller.ts
import { Request, Response } from 'express';
import { KycService } from '../services/kyc.service';
import { catchAsync } from '../utils/catchAsync';

interface AuthRequest extends Request {
    userId?: string;
}

export class KycController {
    private kycService: KycService;

    constructor() {
        this.kycService = new KycService();
    }

    initiateKYC = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;
        const { jobType } = req.body;

        const result = await this.kycService.initiateSmileIDJob(userId, jobType || 'biometric_kyc');

        res.status(200).json({
            status: 'success',
            data: result,
        });
    });

    getKycStatus = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;
        const status = await this.kycService.getKycStatus(userId);

        res.status(200).json({
            status: 'success',
            data: status,
        });
    });

    simulateSuccess = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;
        await this.kycService.simulateSuccess(userId);

        res.status(200).json({
            status: 'success',
            message: 'KYC status updated to verified (simulated)',
        });
    });

    // Webhook for Smile ID results
    handleWebhook = catchAsync(async (req: Request, res: Response) => {
        // In production, verify Smile ID signature
        const { userId, result, status } = req.body;

        if (!userId) {
            return res.status(400).json({ status: 'error', message: 'Missing userId' });
        }

        const kycResult = status === 'success' ? 'verified' : 'failed';
        await this.kycService.updateKycStatus(userId, kycResult, result);

        return res.status(200).json({
            status: 'success',
            message: 'Webhook processed',
        });
    });
}
