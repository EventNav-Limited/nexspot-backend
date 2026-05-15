import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersHelper } from './users.helper.js';
import { ConfigModule } from '../config/config.module.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { EmailVerificationLib } from '../lib/email-verification.lib.js';

@Module({
  imports: [ConfigModule, JwtModule],
  controllers: [UsersController],
  providers: [UsersHelper, UsersService, EmailVerificationLib],
  exports: [UsersHelper],
})
export class UsersModule {}