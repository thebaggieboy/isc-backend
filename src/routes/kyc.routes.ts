// src/routes/kyc.routes.ts
import express from 'express';
import { KycController } from '../controllers/kyc.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const kycController = new KycController();

// Private routes
router.use(authenticate);
router.post('/initiate', kycController.initiateKYC);
router.post('/simulate-success', kycController.simulateSuccess);
router.get('/status', kycController.getKycStatus);

// Public webhook route (not authenticated via user token)
// In production, this would be protected by Smile ID signature verification
router.post('/webhook', kycController.handleWebhook);

export default router;
