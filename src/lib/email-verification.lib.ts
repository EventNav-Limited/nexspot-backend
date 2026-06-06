// src/lib/email-verification.lib.ts

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { sendMail } from './mail.lib.js';
import { UnauthorizedException } from './error.lib.js';
import { env } from '../config/env.js';

export interface VerificationPayload {
  sub: string;
  email: string;
  purpose: 'forgot-password' | 'email-change' | 'registration';
  // 'email-verification' removed — duplicate of 'registration'
}

export interface VerificationResult {
  userId: string;
  email: string;
  purpose: VerificationPayload['purpose'];
}

// ─── Email Layout ───────────────────────────────────────────────────────────

const header = `
  <div style="background:#534AB7;padding:1.5rem 2rem;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:500;color:#EEEDFE;">Nexspot</p>
  </div>`;

const footer = `
  <div style="background:#f9f9f9;padding:1rem 2.5rem;border-top:1px solid #eee;text-align:center;">
    <p style="font-size:12px;color:#aaa;margin:0;">© 2026 Nexspot</p>
  </div>`;

function wrap(content: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:2rem 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
        <tr><td>${header}</td></tr>
        <tr><td style="padding:2rem 2.5rem;">${content}</td></tr>
        <tr><td>${footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Reusable button ────────────────────────────────────────────────────────

function ctaButton(link: string, label: string): string {
  return `
    <div style="text-align:center;margin:2rem 0;">
      <a href="${link}" style="display:inline-block;background:#534AB7;color:#EEEDFE;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:500;">${label}</a>
    </div>
    <p style="font-size:13px;color:#999;margin:0 0 0.5rem;">Or copy and paste this link into your browser:</p>
    <p style="font-size:12px;color:#534AB7;word-break:break-all;margin:0 0 1.5rem;padding:10px 12px;background:#EEEDFE;border-radius:8px;">${link}</p>`;
}

function expiry(message: string): string {
  return `
    <div style="border-top:1px solid #eee;padding-top:1.25rem;">
      <p style="font-size:13px;color:#999;margin:0;line-height:1.6;">${message}</p>
    </div>`;
}

@Injectable()
export class EmailVerificationLib {
  constructor(private jwtService: JwtService) {}

  // ─── Token ─────────────────────────────────────────────────────────────────

  generateToken(payload: VerificationPayload): string {
    const expiresIn =
      payload.purpose === 'forgot-password'
        ? env.PASSWORD_RESET_EXPIRY_MINUTES * 60
        : 60 * 60; // 1 hour for everything else

    return this.jwtService.sign(payload, {
      secret: env.EMAIL_VERIFICATION_SECRET,
      expiresIn,
    });
  }

  verifyToken(token: string): VerificationResult {
    try {
      const payload = this.jwtService.verify<VerificationPayload>(token, {
        secret: env.EMAIL_VERIFICATION_SECRET,
      });
      return {
        userId: payload.sub,
        email: payload.email,
        purpose: payload.purpose,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired verification token');
    }
  }

  // ─── Senders ───────────────────────────────────────────────────────────────

  /**
   * Sent after a user registers with email/password.
   * Contains a link to verify their email and activate their account.
   */
  async sendRegistrationVerification(
    userId: string,
    email: string,
    name: string,
  ): Promise<void> {
    const token = this.generateToken({
      sub: userId,
      email,
      purpose: 'registration',
    });
    const link = `${env.FRONTEND_URL}/auth/verify-email?token=${token}`;

    await sendMail({
      to: email,
      subject: 'Welcome — verify your account',
      html: wrap(`
        <p style="font-size:18px;font-weight:500;margin:0 0 0.5rem;color:#111;">Verify your email address</p>
        <p style="font-size:15px;color:#555;margin:0 0 1.5rem;line-height:1.6;">Hi ${name}, thanks for signing up! Click the button below to verify your email and activate your account.</p>
        ${ctaButton(link, 'Verify my email')}
        ${expiry("This link expires in <strong style='color:#555;'>1 hour</strong>. If you didn't create an account, you can safely ignore this email.")}
      `),
    });
  }

  /**
   * Sent when a user requests a password reset.
   * Contains a link valid for PASSWORD_RESET_EXPIRY_MINUTES minutes.
   */
  async sendForgotPasswordEmail(email: string, userId: string): Promise<void> {
    const token = this.generateToken({
      sub: userId,
      email,
      purpose: 'forgot-password',
    });
    const link = `${env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    await sendMail({
      to: email,
      subject: 'Reset your password',
      html: wrap(`
        <p style="font-size:18px;font-weight:500;margin:0 0 0.5rem;color:#111;">Reset your password</p>
        <p style="font-size:15px;color:#555;margin:0 0 1.5rem;line-height:1.6;">We received a request to reset your password. Click the button below to choose a new one.</p>
        ${ctaButton(link, 'Reset my password')}
        ${expiry("This link expires in <strong style='color:#555;'>${env.PASSWORD_RESET_EXPIRY_MINUTES} minutes</strong>. If you didn't request this, you can safely ignore this email.")}
      `),
    });
  }

  /**
   * Sent when a user requests to change their email address.
   * The link must be clicked from the NEW email address to confirm ownership.
   */
  async sendEmailChangeVerification(
    newEmail: string,
    userId: string,
  ): Promise<void> {
    const token = this.generateToken({
      sub: userId,
      email: newEmail,
      purpose: 'email-change',
    });
    const link = `${env.FRONTEND_URL}/me/confirm-email-change?token=${token}`;

    await sendMail({
      to: newEmail,
      subject: 'Confirm your new email',
      html: wrap(`
        <p style="font-size:18px;font-weight:500;margin:0 0 0.5rem;color:#111;">Confirm your new email</p>
        <p style="font-size:15px;color:#555;margin:0 0 1.5rem;line-height:1.6;">Click the button below to confirm <strong style="color:#111;">${newEmail}</strong> as your new email address.</p>
        ${ctaButton(link, 'Confirm new email')}
        ${expiry("This link expires in <strong style='color:#555;'>1 hour</strong>. If you didn't request this change, please secure your account immediately.")}
      `),
    });
  }

  /**
   * Sent to a user after they purchase a ticket for an event.
   * Contains the event details and ticket information.
   */
  async sendTicketConfirmation(
    email: string,
    name: string,
    event: {
      title: string;
      date: Date;
      location: string;
      ticketType: string;
      quantity: number;
      total: string;
    },
  ): Promise<void> {
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(event.date);

    await sendMail({
      to: email,
      subject: `Your ticket for ${event.title}`,
      html: wrap(`
        <p style="font-size:18px;font-weight:500;margin:0 0 0.5rem;color:#111;">You're going! 🎉</p>
        <p style="font-size:15px;color:#555;margin:0 0 1.5rem;line-height:1.6;">Hi ${name}, your ticket for <strong style="color:#111;">${event.title}</strong> has been confirmed.</p>

        <div style="background:#f9f9f9;border-radius:8px;padding:16px 20px;margin-bottom:1.5rem;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;color:#999;padding-bottom:12px;">Event</td>
              <td style="font-size:14px;color:#111;font-weight:500;padding-bottom:12px;text-align:right;">${event.title}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#999;padding-bottom:12px;">Date</td>
              <td style="font-size:14px;color:#111;padding-bottom:12px;text-align:right;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#999;padding-bottom:12px;">Location</td>
              <td style="font-size:14px;color:#111;padding-bottom:12px;text-align:right;">${event.location}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#999;padding-bottom:12px;">Ticket type</td>
              <td style="font-size:14px;color:#111;padding-bottom:12px;text-align:right;">${event.ticketType}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#999;padding-bottom:12px;">Quantity</td>
              <td style="font-size:14px;color:#111;padding-bottom:12px;text-align:right;">${event.quantity}</td>
            </tr>
            <tr style="border-top:1px solid #eee;">
              <td style="font-size:13px;color:#111;font-weight:500;padding-top:12px;">Total</td>
              <td style="font-size:15px;color:#534AB7;font-weight:500;padding-top:12px;text-align:right;">${event.total}</td>
            </tr>
          </table>
        </div>

        ${expiry('Keep this email as your proof of purchase. See you there!')}
      `),
    });
  }
}
