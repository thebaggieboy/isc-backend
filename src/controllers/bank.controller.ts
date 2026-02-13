import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { bankService } from '../services/bank.service';
import { catchAsync } from '../utils/catchAsync';

export class BankController {
    private bankService = bankService;

    addBank = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;
        const { bankName, accountNumber, accountName, bankCode, isDefault } = req.body;

        const bank = await this.bankService.addBank(userId, {
            bankName,
            accountNumber,
            accountName,
            bankCode,
            isDefault,
        });

        res.status(201).json({
            status: 'success',
            data: { bank },
        });
    });

    getBanks = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;
        const banks = await this.bankService.getUserBanks(userId);

        res.status(200).json({
            status: 'success',
            data: { banks },
        });
    });

    deleteBank = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;
        const { id } = req.params;

        await this.bankService.deleteBank(userId, id);

        res.status(204).json({
            status: 'success',
            data: null,
        });
    });

    setDefaultBank = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;
        const { id } = req.params;

        const bank = await this.bankService.setDefaultBank(userId, id);

        res.status(200).json({
            status: 'success',
            data: { bank },
        });
    });
}

export const bankController = new BankController();
