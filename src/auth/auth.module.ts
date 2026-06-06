import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { PrismaService } from '../config/prisma.service.js';
import { JwtStrategy } from './strategies/jwt.strategies.js';
import { GoogleStrategy } from './strategies/google.strategies.js';
import { EmailVerificationLib } from '../lib/email-verification.lib.js';

@Module({
  imports: [UsersModule, JwtModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TokenService,
    PrismaService,
    GoogleStrategy,
    EmailVerificationLib,
  ],
})
export class AuthModule {}
