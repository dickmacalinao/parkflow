import { Resend } from 'resend';
import { env, isTest } from '../config/env.js';
import { logger } from '../config/logger.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin wrapper around Resend. In test/dev without a real API key, emails are logged
 * instead of sent, so the rest of the flow (token generation, DB state) can be exercised
 * without external network calls.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (isTest || !resend) {
    logger.info('Email (not sent - no RESEND_API_KEY or test env)', { to, subject });
    return;
  }
  await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
}

export const emailTemplates = {
  verifyEmail: (name: string, link: string) => ({
    subject: 'Verify your ParkFlow account',
    html: `<p>Hi ${name},</p><p>Confirm your email to activate your ParkFlow account:</p><p><a href="${link}">${link}</a></p>`,
  }),
  resetPassword: (name: string, link: string) => ({
    subject: 'Reset your ParkFlow password',
    html: `<p>Hi ${name},</p><p>Reset your password using the link below. It expires in 1 hour.</p><p><a href="${link}">${link}</a></p>`,
  }),
  propertyInvite: (name: string, link: string, role: string) => ({
    subject: 'You have been invited to ParkFlow',
    html: `<p>Hi ${name},</p><p>You've been invited to join ParkFlow as a ${role}. Accept your invitation:</p><p><a href="${link}">${link}</a></p>`,
  }),
  reservationDecision: (name: string, approved: boolean, propertyName: string, slotCode: string) => ({
    subject: approved ? 'Your parking reservation was approved' : 'Your parking reservation was rejected',
    html: `<p>Hi ${name},</p><p>Your reservation for bay ${slotCode} at ${propertyName} was <strong>${
      approved ? 'approved' : 'rejected'
    }</strong>.</p>`,
  }),
};
