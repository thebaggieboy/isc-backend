// src/controllers/transaction.controller.ts
import { Request, Response } from 'express';
import { TransactionService } from '../services/transaction.service';
import { catchAsync } from '../utils/catchAsync';

interface AuthRequest extends Request {
  userId?: string;
}

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  getAllTransactions = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string | undefined;

    const result = await this.transactionService.getAllTransactions(
      userId,
      page,
      limit,
      type
    );

    res.json({
      status: 'success',
      data: result,
    });
  });

  getTransactionById = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    const transaction = await this.transactionService.getTransactionById(userId, id);

    res.json({
      status: 'success',
      data: { transaction },
    });
  });

  initiateDeposit = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { amount } = req.body;

    const result = await this.transactionService.initiateDeposit(userId, amount);

    res.json({
      status: 'success',
      message: 'Deposit initiated',
      data: result,
    });
  });

  initiateWithdrawal = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { amount } = req.body;

    const result = await this.transactionService.initiateWithdrawal(userId, amount);

    res.json({
      message: 'Withdrawal initiated',
      data: result,
    });
  });

  verifyDeposit = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { reference } = req.body;

    const result = await this.transactionService.verifyDeposit(userId, reference);

    res.json({
      status: 'success',
      message: 'Deposit verified',
      data: result,
    });
  });
}
