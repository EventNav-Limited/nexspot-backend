import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthRegistrationService } from './services/auth-registration.service.js';
import { AuthLoginService } from './services/auth-login.service.js';
import { AuthPasswordService } from './services/auth-password.service.js';
import { TokenService } from './services/token.service.js';
import { AuthRegistrationController } from './controllers/auth-registration.controller.js';
import { AuthLoginController } from './controllers/auth-login.controller.js';
import { AuthPasswordController } from './controllers/auth-password.controller.js';
import { UsersModule } from '../users/users.module.js';
import { PrismaService } from '../config/prisma.service.js';
import { JwtStrategy } from './strategies/jwt.strategies.js';
import { GoogleStrategy } from './strategies/google.strategies.js';
import { EmailVerificationLib } from '../lib/email-verification.lib.js';

@Module({
  imports: [UsersModule, JwtModule],
  controllers: [
    AuthRegistrationController,
    AuthLoginController,
    AuthPasswordController,
  ],
  providers: [
    AuthRegistrationService,
    AuthLoginService,
    AuthPasswordService,
    JwtStrategy,
    TokenService,
    PrismaService,
    GoogleStrategy,
    EmailVerificationLib,
  ],
})
export class AuthModule {}
