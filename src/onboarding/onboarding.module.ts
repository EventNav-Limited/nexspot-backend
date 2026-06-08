// src/onboarding/onboarding.module.ts

import { Module } from '@nestjs/common';
import { OnboardingService } from './services/onboarding.service.js';
import { OnboardingController } from './controllers/onboarding.controller.js';
import { UsersModule } from '../users/users.module.js';
import { PrismaService } from '../config/prisma.service.js';

@Module({
  imports: [UsersModule],
  providers: [OnboardingService, PrismaService],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
