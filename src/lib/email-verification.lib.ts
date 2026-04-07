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
    await sendMail({
      to: email,
      subject: 'Welcome — verify your account',
      html: `<p>Dear ${name}, Thanks for signing up!</p>`,
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
