// src/onboarding/onboarding.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service.js';
import { UsersHelper } from '../users/users.helper.js';
import { SaveInterestsDto } from './dto/save-interests.dto.js';
import { SaveLocationDto } from './dto/save-location.dto.js';

@Injectable()
export class OnboardingService {
  constructor(
    private usersHelper: UsersHelper,
    private prisma: PrismaService,
  ) {}

  async saveInterests(userId: string, dto: SaveInterestsDto): Promise<void> {
    // Delete existing selections first, then insert new ones
    // This handles re-submission cleanly
    await this.prisma.userInterest.deleteMany({ where: { userId } });

    await this.prisma.userInterest.createMany({
      data: dto.interest_ids.map((interestId) => ({
        userId,
        interestId,
      })),
    });
  }

  async saveLocation(
    userId: string,
    dto: SaveLocationDto,
  ): Promise<{ onboarding_completed: boolean }> {
    // Upsert contact — create if first time, update if already exists
    await this.prisma.contact.upsert({
      where: { userId },
      create: {
        userId,
        city: dto.city,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      update: {
        city: dto.city,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    await this.usersHelper.completeOnboarding(userId);
    return { onboarding_completed: true };
  }

  async skip(userId: string): Promise<{ onboarding_completed: boolean }> {
    await this.usersHelper.completeOnboarding(userId);
    return { onboarding_completed: true };
  }

  getInterests() {
    return this.prisma.interest.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
