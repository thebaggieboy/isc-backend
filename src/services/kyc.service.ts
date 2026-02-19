// src/services/kyc.service.ts
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
// @ts-ignore - Library will be installed
import { WebApi, IDApi, Signature } from 'smile-identity-core';

const prisma = new PrismaClient();

export class KycService {
    private partnerId = process.env.SMILE_ID_PARTNER_ID || '';

    async updateKycStatus(userId: string, status: 'pending' | 'verified' | 'failed', _metadata?: any) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                kycStatus: status,
                isVerified: status === 'verified',
            },
        });

        logger.info(`KYC status updated for user ${userId}: ${status}`);

        // Here we could also log the metadata or trigger notifications

        return updatedUser;
    }

    async simulateSuccess(userId: string) {
        return await this.updateKycStatus(userId, 'verified', { source: 'simulation' });
    }

    async getKycStatus(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                kycStatus: true,
                isVerified: true,
            },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return user;
    }

    // Initiate Smile ID Job capture config
    async initiateSmileIDJob(userId: string, jobType: string) {
        logger.info(`Initiating Smile ID job for user ${userId}, type: ${jobType}`);

        // In a real implementation with keys, we would generate a signature
        /*
        const signatureHelper = new Signature(this.partnerId, this.apiKey);
        const signature = signatureHelper.generate_signature();
        */

        return {
            status: 'initiated',
            partner_id: this.partnerId,
            timestamp: new Date().toISOString(),
            job_id: `sm_${userId}_${Date.now()}`,
            job_type: jobType,
            callback_url: `${process.env.BACKEND_URL}/api/v1/kyc/webhook`,
        };
    }
}
