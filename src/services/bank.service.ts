import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BankService {
    async addBank(userId: string, data: { bankName: string; accountNumber: string; accountName: string; bankCode?: string; isDefault?: boolean }) {
        // If setting as default, unset others first
        if (data.isDefault) {
            await prisma.bank.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }

        // Check if this is the first bank, if so make it default
        const count = await prisma.bank.count({ where: { userId } });
        if (count === 0) {
            data.isDefault = true;
        }

        return await prisma.bank.create({
            data: {
                userId,
                ...data,
            },
        });
    }

    async getUserBanks(userId: string) {
        return await prisma.bank.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async deleteBank(userId: string, bankId: string) {
        return await prisma.bank.delete({
            where: { id: bankId, userId },
        });
    }

    async setDefaultBank(userId: string, bankId: string) {
        // Unset current default
        await prisma.bank.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });

        // Set new default
        return await prisma.bank.update({
            where: { id: bankId, userId },
            data: { isDefault: true },
        });
    }
}

export const bankService = new BankService();
