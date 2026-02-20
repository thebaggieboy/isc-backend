import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const expo = new Expo();
const prisma = new PrismaClient();

export class NotificationService {
    /**
     * Send push notifications to a user
     */
    async sendPushNotification(userId: string, title: string, body: string, data?: any) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { pushToken: true }
            });

            if (!user?.pushToken) {
                console.log(`No push token for user ${userId}`);
                return;
            }

            const pushToken = user.pushToken;

            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                return;
            }

            const messages: ExpoPushMessage[] = [{
                to: pushToken,
                sound: 'default',
                title,
                body,
                data,
            }];

            const chunks = expo.chunkPushNotifications(messages);

            for (const chunk of chunks) {
                try {
                    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    console.log('Push notification sent:', ticketChunk);
                } catch (error) {
                    console.error('Error sending push notification chunk:', error);
                }
            }
        } catch (error) {
            console.error('Error in sendPushNotification:', error);
        }
    }

    /**
     * Update user's push token
     */
    async updatePushToken(userId: string, token: string) {
        return await prisma.user.update({
            where: { id: userId },
            data: { pushToken: token }
        });
    }
}

export const notificationService = new NotificationService();
