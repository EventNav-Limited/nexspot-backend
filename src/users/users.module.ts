import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersHelper } from './users.helper.js';
import { ConfigModule } from '../config/config.module.js';
import { UsersProfileService } from './services/users-profile.service.js';
import { UsersElevationService } from './services/users-elevation.service.js';
import { UsersActivityService } from './services/users-activity.service.js';
import { UsersProfileController } from './controllers/users-profile.controller.js';
import { UsersElevationController } from './controllers/users-elevation.controller.js';
import { UsersActivityController } from './controllers/users-activity.controller.js';
import { EmailVerificationLib } from '../lib/email-verification.lib.js';
import { TimezoneHelper } from '../lib/timezone.helper.js';

@Module({
  imports: [ConfigModule, JwtModule],
  controllers: [
    UsersProfileController,
    UsersElevationController,
    UsersActivityController,
  ],
  providers: [
    UsersHelper,
    UsersProfileService,
    UsersElevationService,
    UsersActivityService,
    EmailVerificationLib,
    TimezoneHelper,
  ],
  exports: [UsersHelper],
})
export class UsersModule {}
