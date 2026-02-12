// src/services/transaction.service.ts
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class TransactionService {
  async getAllTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: string
  ) {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionById(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    return transaction;
  }

  async initiateDeposit(userId: string, amount: number) {
    // Validate amount
    const minDeposit = Number(process.env.MIN_DEPOSIT_AMOUNT) || 1000;
    if (amount < minDeposit) {
      throw new AppError(`Minimum deposit is ₦${minDeposit.toLocaleString()}`, 400);
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate unique reference
    const reference = `dep_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Create pending transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'deposit',
        amount,
        balanceBefore: user.balance.toNumber(),
        balanceAfter: user.balance.toNumber(), // Will be updated on completion
        status: 'pending',
        reference,
        description: `Deposit of ₦${amount.toLocaleString()}`,
      },
    });

    // In production, integrate with Paystack here
    // const paystackUrl = await initializePaystackPayment(user.email, amount, reference);

    return {
      transaction,
      reference,
      // paymentUrl: paystackUrl, // Return Paystack payment URL
      message: 'Deposit initiated. Complete payment to credit your account.',
    };
  }

  async initiateWithdrawal(userId: string, amount: number) {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check sufficient balance
    if (user.balance.toNumber() < amount) {
      throw new AppError('Insufficient balance', 400);
    }

    // Generate unique reference
    const reference = `wdr_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Process withdrawal in transaction
    const result = await prisma.$transaction(async (tx) => {
      const balanceBefore = user.balance.toNumber();
      const balanceAfter = balanceBefore - amount;

      // Update user balance
      await tx.user.update({
        where: { id: userId },
        data: { balance: balanceAfter },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'withdrawal',
          amount,
          balanceBefore,
          balanceAfter,
          status: 'completed',
          reference,
          description: `Withdrawal of ₦${amount.toLocaleString()}`,
          completedAt: new Date(),
        },
      });

      return transaction;
    });

    return {
      transaction: result,
      message: 'Withdrawal successful',
    };
  }

  async completeDeposit(reference: string) {
    // This would be called by Paystack webhook
    const transaction = await prisma.transaction.findUnique({
      where: { reference },
      include: { user: true },
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.status === 'completed') {
      throw new AppError('Transaction already completed', 400);
    }

    // Complete deposit in transaction
    await prisma.$transaction(async (tx) => {
      const balanceBefore = transaction.user.balance.toNumber();
      const amount = transaction.amount.toNumber();
      const balanceAfter = balanceBefore + amount;

      // Update user balance
      await tx.user.update({
        where: { id: transaction.userId },
        data: { balance: balanceAfter },
      });

      // Update transaction
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'completed',
          balanceAfter,
          completedAt: new Date(),
        },
      });
    });

    return { message: 'Deposit completed successfully' };
  }
}
