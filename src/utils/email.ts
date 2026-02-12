// src/utils/email.ts
import nodemailer from 'nodemailer';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const emailService = {
  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@saveguard.app',
        to: email,
        subject: 'Verify your SaveGuard account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ff4444;">Welcome to SaveGuard!</h2>
            <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
            <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ff4444; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Verify Email
            </a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="color: #888; word-break: break-all;">${verificationUrl}</p>
            <p style="color: #888; font-size: 12px; margin-top: 32px;">If you didn't create this account, please ignore this email.</p>
          </div>
        `,
      });

      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw error;
    }
  },

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@saveguard.app',
        to: email,
        subject: 'Reset your SaveGuard password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ff4444;">Password Reset Request</h2>
            <p>You requested to reset your password. Click the link below to create a new password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ff4444; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Reset Password
            </a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="color: #888; word-break: break-all;">${resetUrl}</p>
            <p style="color: #888;">This link will expire in 1 hour.</p>
            <p style="color: #888; font-size: 12px; margin-top: 32px;">If you didn't request a password reset, please ignore this email.</p>
          </div>
        `,
      });

      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  },

  async sendLockNotification(email: string, amount: number, days: number, unlockDate: Date) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@saveguard.app',
        to: email,
        subject: 'Funds Locked Successfully',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ff4444;">Funds Locked Successfully! 🔒</h2>
            <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 8px 0;"><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
              <p style="margin: 8px 0;"><strong>Lock Period:</strong> ${days} days</p>
              <p style="margin: 8px 0;"><strong>Unlock Date:</strong> ${unlockDate.toLocaleDateString()}</p>
            </div>
            <p>Your funds are now safely locked and will be automatically unlocked on the date above.</p>
            <p style="color: #888; font-size: 14px; margin-top: 24px;">Keep building those savings! 💪</p>
          </div>
        `,
      });

      logger.info(`Lock notification sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send lock notification:', error);
      // Don't throw - this is not critical
    }
  },

  async sendUnlockNotification(email: string, amount: number) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@saveguard.app',
        to: email,
        subject: 'Funds Unlocked - Congrats! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ff4444;">Congratulations! 🎉</h2>
            <p>Your locked funds have been successfully unlocked and added back to your balance.</p>
            <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 8px 0;"><strong>Unlocked Amount:</strong> ₦${amount.toLocaleString()}</p>
            </div>
            <p>Great job staying committed to your savings goals! 💰</p>
            <p style="color: #888; font-size: 14px; margin-top: 24px;">Ready to lock more funds?</p>
          </div>
        `,
      });

      logger.info(`Unlock notification sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send unlock notification:', error);
      // Don't throw - this is not critical
    }
  },

  async sendWelcomeEmail(email: string, name: string) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@saveguard.app',
        to: email,
        subject: 'Welcome to SaveGuard! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ff4444;">Welcome to SaveGuard, ${name}! 🎉</h2>
            <p>We're excited to have you join us on your journey to better financial habits.</p>
            <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="color: #333; margin-top: 0;">Getting Started:</h3>
              <ul style="color: #666;">
                <li>Deposit funds to your account</li>
                <li>Lock amounts for set periods</li>
                <li>Track your impulse control progress</li>
                <li>Build your savings streak</li>
              </ul>
            </div>
            <p>Ready to master your impulses and watch your savings grow?</p>
            <a href="${process.env.FRONTEND_URL}" style="display: inline-block; padding: 12px 24px; background-color: #ff4444; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Get Started
            </a>
          </div>
        `,
      });

      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw - this is not critical
    }
  },
};
