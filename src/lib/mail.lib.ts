// src/lib/mail.lib.ts

import { SendMailClient } from 'zeptomail';
import { env } from '../config/env.js';

export interface MailOptions {
  to: string;
  subject: string;
  html?: string;
}

const client = new SendMailClient({
  url: 'https://api.zeptomail.com/v1.1/email',
  token: env.MAIL_PASS, // your ZeptoMail token
});

export async function sendMail(options: MailOptions): Promise<void> {
  await client.sendMail({
    from: {
      address: env.MAIL_FROM,
      name: env.MAIL_FROM_NAME,
    },
    to: [
      {
        email_address: {
          address: options.to,
        },
      },
    ],
    subject: options.subject,
    htmlbody: options.html,
  });
}
