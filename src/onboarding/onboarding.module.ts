// src/onboarding/onboarding.module.ts

import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service.js';
import { OnboardingController } from './onboarding.controller.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  providers: [OnboardingService],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
