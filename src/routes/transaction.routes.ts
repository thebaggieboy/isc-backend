// src/routes/transaction.routes.ts
import express from 'express';
import { body, query } from 'express-validator';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = express.Router();
const transactionController = new TransactionController();

// All routes require authentication
router.use(authenticate);

// Get all transactions
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn(['deposit', 'withdrawal', 'lock', 'unlock', 'fee']),
  ],
  validate,
  transactionController.getAllTransactions
);

// Get transaction by ID
router.get('/:id', transactionController.getTransactionById);

// Initiate deposit
router.post(
  '/deposit',
  [body('amount').isFloat({ min: 1000 })],
  validate,
  transactionController.initiateDeposit
);

// Initiate withdrawal
router.post(
  '/withdraw',
  [body('amount').isFloat({ min: 1000 })],
  validate,
  validate,
  transactionController.initiateWithdrawal
);

// Verify deposit
router.post(
  '/verify',
  [body('reference').notEmpty()],
  validate,
  transactionController.verifyDeposit
);

export default router;
