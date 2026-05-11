// src/lib/email-verification.lib.ts

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { sendMail } from './mail.lib.js';
import { UnauthorizedException } from './error.lib.js';
import { env } from '../config/env.js';

export interface VerificationPayload {
  sub: string;
  email: string;
  purpose:
    | 'email-verification'
    | 'forgot-password'
    | 'email-change'
    | 'registration';
}

export interface VerificationResult {
  userId: string;
  email: string;
  purpose: VerificationPayload['purpose'];
}

@Injectable()
export class EmailVerificationLib {
  constructor(private jwtService: JwtService) {} // ← ConfigService removed

  // ─── Token ─────────────────────────────────────────────────────────────────

  generateToken(payload: VerificationPayload): string {
    const expiresIn =
      payload.purpose === 'forgot-password'
        ? env.PASSWORD_RESET_EXPIRY_MINUTES * 60 // convert minutes to seconds
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

  async sendRegistrationVerification(
    email: string,
    name: string,
  ): Promise<void> {
    // TODO: make it such that clicking this link maked is verified to be true.
    await sendMail({
      to: email,
      subject: 'Welcome — verify your account',
      html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f4f4f4;font-family:sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:2rem 0;">
          <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">

              <tr>
                <td style="background:#534AB7;padding:2rem;text-align:center;">
                  <p style="margin:0;font-size:22px;font-weight:500;color:#EEEDFE;">Nexspot</p>
                </td>
              </tr>

              <tr>
                <td style="padding:2rem 2.5rem;">
                  <p style="font-size:18px;font-weight:500;margin:0 0 0.5rem;color:#111;">Verify your email address</p>
                  <p style="font-size:15px;color:#555;margin:0 0 1.5rem;line-height:1.6;">Hi ${name}, thanks for signing up! Click the button below to verify your email and activate your account.</p>

                  <div style="text-align:center;margin:2rem 0;">
                    <a href="${env.VERIFICATION_LINK}" style="display:inline-block;background:#534AB7;color:#EEEDFE;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:500;">Verify my email</a>
                  </div>

                  <p style="font-size:13px;color:#999;margin:0 0 0.5rem;">Or copy and paste this link into your browser:</p>
                  <p style="font-size:12px;color:#534AB7;word-break:break-all;margin:0 0 1.5rem;padding:10px 12px;background:#EEEDFE;border-radius:8px;">${env.VERIFICATION_LINK}</p>

                  <div style="border-top:1px solid #eee;padding-top:1.25rem;">
                    <p style="font-size:13px;color:#999;margin:0;line-height:1.6;">This link expires in <strong style="color:#555;">1 hour</strong>. If you didn't create an account, you can safely ignore this email.</p>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#f9f9f9;padding:1.25rem 2.5rem;border-top:1px solid #eee;text-align:center;">
                  <p style="font-size:12px;color:#aaa;margin:0;">© 2026 Nexspot</p>
                </td>
              </tr>

            </table>
          </td></tr>
        </table>
      </body>
      </html>`,
    });
  }

  async sendForgotPasswordEmail(email: string, userId: string): Promise<void> {
    const token = this.generateToken({
      sub: userId,
      email,
      purpose: 'forgot-password',
    });
    const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendMail({
      to: email,
      subject: 'Reset your password',
      html: `<p>Click <a href="${link}">here</a> to reset your password. Expires in 1 hour.</p>`,
    });
  }

  async sendEmailVerification(email: string, userId: string): Promise<void> {
    const token = this.generateToken({
      sub: userId,
      email,
      purpose: 'email-verification',
    });
    const link = `${env.FRONTEND_URL}/verify-email?token=${token}`;

    await sendMail({
      to: email,
      subject: 'Verify your email',
      html: `<p>Click <a href="${link}">here</a> to verify your email. Expires in 1 hour.</p>`,
    });
  }

  async sendEmailChangeVerification(
    newEmail: string,
    userId: string,
  ): Promise<void> {
    const token = this.generateToken({
      sub: userId,
      email: newEmail,
      purpose: 'email-change',
    });
    const link = `${env.FRONTEND_URL}/confirm-email-change?token=${token}`;

    await sendMail({
      to: newEmail,
      subject: 'Confirm your new email',
      html: `<p>Click <a href="${link}">here</a> to confirm your new email. Expires in 1 hour.</p>`,
    });
  }
}
