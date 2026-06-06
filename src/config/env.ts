// src/config/env.ts

import 'dotenv/config';
import { z } from 'zod';
import type { StringValue } from 'ms';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REFRESH_SECRET: z.string(),
  REFRESH_EXPIRES_IN: z
    .string()
    .default('7d')
    .transform((v) => v as StringValue),
  ACCESS_SECRET: z.string(),
  ACCESS_EXPIRES_IN: z
    .string()
    .default('15m')
    .transform((v) => v as StringValue),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PASSWORD_RESET_EXPIRY_MINUTES: z.coerce.number().default(60),
  EMAIL_VERIFICATION_SECRET: z.string(),
  FRONTEND_URL: z.url(),
  MAIL_PASS: z.string(),
  MAIL_FROM: z.string().email(),
  MAIL_FROM_NAME: z.string().default('App'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().url(),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof schema>;
