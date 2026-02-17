import 'dotenv/config'; // Required if running with tsx/node directly

interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN;
  PORT: number;
  NODE_ENV: string;
  PASSWORD_RESET_EXPIRY_MINUTES: number;
  // EMAIL_SERVICE: string;
  // EMAIL_HOST: string;
  // EMAIL_PORT: number;
  // EMAIL_USER: string;
  // EMAIL_PASSWORD: string;
  // EMAIL_FROM: string;
  // OTP_EXPIRY_MINUTES: number;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

export const env: EnvConfig = {
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN'),
  PORT: parseInt(getEnvVar('PORT', '3000'), 10),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PASSWORD_RESET_EXPIRY_MINUTES: parseInt(
    getEnvVar('PASSWORD_RESET_EXPIRY_MINUTES', '60'),
    10,
  ),
  // EMAIL_SERVICE: getEnvVar('EMAIL_SERVICE', 'smtp'),
  // EMAIL_HOST: getEnvVar('EMAIL_HOST'),
  // EMAIL_PORT: parseInt(getEnvVar('EMAIL_PORT', '587'), 10),
  // EMAIL_USER: getEnvVar('EMAIL_USER'),
  // EMAIL_PASSWORD: getEnvVar('EMAIL_PASSWORD'),
  // EMAIL_FROM: getEnvVar('EMAIL_FROM'),
  // OTP_EXPIRY_MINUTES: parseInt(getEnvVar('OTP_EXPIRY_MINUTES', '10'), 10),
};
