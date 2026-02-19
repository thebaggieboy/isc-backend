// src/routes/index.ts
import express from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import transactionRoutes from './transaction.routes';
import lockRoutes from './lock.routes';
import scheduleRoutes from './schedule.routes';
import impulseRoutes from './impulse.routes';
import kycRoutes from './kyc.routes';

import { bankRoutes } from './bank.routes';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/user', userRoutes);  // ✅ Changed from '/users' to '/user' to match frontend
router.use('/transactions', transactionRoutes);
router.use('/locks', lockRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/impulse', impulseRoutes);
router.use('/banks', bankRoutes);
router.use('/kyc', kycRoutes);

// API Info
router.get('/', (_req, res) => {
  res.json({
    name: 'SaveGuard API',
    version: process.env.API_VERSION || 'v1',
    status: 'active',
    endpoints: {
      auth: '/auth',
      user: '/user',  // ✅ Changed from 'users' to 'user'
      transactions: '/transactions',
      locks: '/locks',
      schedules: '/schedules',
      impulse: '/impulse'
    }
  });
});

export default router;