// src/lib/mail.lib.ts

import * as nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface MailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

const transporter = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  secure: env.MAIL_SECURE,
  auth: {
    user: env.MAIL_USER,
    pass: env.MAIL_PASS,
  },
});

export async function sendMail(options: MailOptions): Promise<void> {
  await transporter.sendMail({
    from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
