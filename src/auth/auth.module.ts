import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersModule } from '../users/users.module.js';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategies.js';
import { TokenService } from './token.service.js';
import { PrismaService } from '../config/prisma.service.js';
import { EmailVerificationLib } from '../lib/email-verification.lib.js';

@Module({
  imports: [UsersModule, JwtModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TokenService,
    PrismaService,
    EmailVerificationLib,
  ],
})
export class AuthModule {}
