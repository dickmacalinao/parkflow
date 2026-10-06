import { Resend } from 'resend';
import { env, isTest } from '../config/env.js';
import { logger } from '../config/logger.js';
import { capitalize } from '../utils/string.js';

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
    logger.info('Email not sent: no RESEND_API_KEY configured (or running in a test environment)', { to, subject });
    return;
  }

  try {
    const { data, error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });

    if (error) {
      // The Resend SDK resolves with { error } instead of throwing for API-level failures
      // (an unverified sending domain, an invalid API key, a sandbox-sender recipient
      // restriction, rate limiting, ...). Previously that error was never inspected, so a
      // failed send was indistinguishable from a successful one - no exception, no log.
      // Logged loudly here, but not re-thrown: a misconfigured/down email provider
      // shouldn't take registration, password reset, or invitations down with it. If you'd
      // rather the request itself fail when its email can't be sent, throw here instead.
      logger.error('Resend rejected an email send', { to, subject, error });
      return;
    }

    logger.info('Email sent via Resend', { to, subject, id: data?.id });
  } catch (err) {
    // Reserved for failures that happen before Resend even responds: DNS, timeout, outage.
    logger.error('Failed to reach Resend', { to, subject, err });
  }
}

export const emailTemplates = {
  verifyEmail: (name: string, link: string) => ({
    subject: 'Verify your ParkFlow account',
    html: `<p>Hi ${name},</p><p>Confirm your email to activate your ParkFlow account:</p><p><a href="${link}">${link}</a></p><p><p>Best regards,<br/>ParkFlow</p></p>`,
  }),
  resetPassword: (name: string, link: string) => ({
    subject: 'Reset your ParkFlow password',
    html: `<p>Hi ${name},</p><p>Reset your password using the link below. It expires in 1 hour.</p><p><a href="${link}">${link}</a></p><p><p>Best regards,<br/>ParkFlow</p></p>`,
  }),
  propertyInvite: (name: string, link: string, role: string) => ({
    subject: 'You have been invited to ParkFlow',
    html: `<p>Hi ${name},</p><p>You've been invited to join ParkFlow as a ${capitalize(role)}. Accept your invitation:</p><p><a href="${link}">${link}</a></p><p><p>Best regards,<br/>ParkFlow</p></p>`,
  }),
  reservationDecision: (name: string, approved: boolean, propertyName: string, slotCode: string) => ({
    subject: approved ? 'Your parking reservation was approved' : 'Your parking reservation was rejected',
    html: `<p>Hi ${name},</p><p>Your reservation for bay ${slotCode} at ${propertyName} was <strong>${
      approved ? 'approved' : 'rejected'
    }</strong>.</p><p><p>Best regards,<br/>ParkFlow</p></p>`,
  }),
};
