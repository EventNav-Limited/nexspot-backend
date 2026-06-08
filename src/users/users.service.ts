import argon2 from 'argon2';
import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '../lib/error.lib.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { EditProfileDto } from './dto/edit-profile.dto.js';
import { UpdateProfilePhotoDto } from './dto/update-profile-photo.dto.js';
import { UpdateEmailDto } from './dto/update-email.dto.js';
import { UsersHelper } from './users.helper.js';
import { mapUser } from './users.mapper.js';
import { mapEvent } from '../events/event.helpers.js';
import { EmailVerificationLib } from '../lib/email-verification.lib.js';
import { PrismaService } from '../config/prisma.service.js';
import { OrderStatus } from '../generated/prisma/enums.js';
import { GetMyEventsDto } from './dto/get-my-events.dto.js';
import { getTimezoneFromLocation } from '../lib/timezone.lib.js';

@Injectable()
export class UsersService {
  constructor(
    private usersHelper: UsersHelper,
    private emailVerificationLib: EmailVerificationLib,
    private prisma: PrismaService,
  ) {}

  /**
   * Returns the IANA timezone for a user from their Contact record.
   * Falls back to country-derived timezone, then 'UTC'.
   */
  private async getUserTimezone(userId: string): Promise<string> {
    const contact = await this.prisma.contact.findUnique({
      where: { userId },
      select: { timezone: true, city: true, country: true },
    });
    if (contact?.timezone) return contact.timezone;
    return getTimezoneFromLocation(contact?.city, contact?.country);
  }

  // ─── user-details ──────────────────────────────────────────────────────────────

  async userProfile(email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return mapUser(user);
  }

  // ─── change-password ──────────────────────────────────────────────────────────────

  async changePassword(dto: ChangePasswordDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please login with Google.',
      );
    }
    // Compare passwords
    const isMatch = await argon2.verify(user.password, dto.oldPassword);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }
    const hashedPassword = await argon2.hash(dto.password);
    await this.usersHelper.update(user.id, {
      password: hashedPassword,
    });
    return {
      message:
        'Password has been reset. You can now log in with your new password.',
    };
  }

  // ─── edit-profile ──────────────────────────────────────────────────────────────

  async editProfile(dto: EditProfileDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updated = await this.usersHelper.update(user.id, {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
    });

    return mapUser(updated);
  }

  // ─── update-profile-photo ──────────────────────────────────────────────────────────────

  async updateProfilePhoto(dto: UpdateProfilePhotoDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updated = await this.usersHelper.update(user.id, {
      profilePhotoURL: dto.profilePhotoURL,
    });

    return mapUser(updated);
  }

  // ─── update-email ──────────────────────────────────────────────────────────────

  async requestEmailUpdate(dto: UpdateEmailDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Only local accounts can change email
    if (user.authProvider !== 'LOCAL') {
      throw new BadRequestException(
        'Email cannot be changed for Google accounts.',
      );
    }

    // Confirm identity with current password
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await argon2.verify(user.password, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    // Check new email is not already taken
    const emailTaken = await this.usersHelper.findByEmail(
      dto.newEmail.toLowerCase(),
    );
    if (emailTaken) {
      throw new BadRequestException('This email is already in use.');
    }

    // Send verification to the NEW email
    await this.emailVerificationLib.sendEmailChangeVerification(
      dto.newEmail.toLowerCase(),
      user.id,
    );

    return {
      message: `A verification link has been sent to ${dto.newEmail}. Please confirm to complete the email change.`,
    };
  }

  // ─── confirm-email-change ──────────────────────────────────────────────────────────────

  async confirmEmailChange(token: string) {
    const { userId, email, purpose } =
      this.emailVerificationLib.verifyToken(token);

    if (purpose !== 'email-change') {
      throw new BadRequestException('Invalid token purpose');
    }

    await this.usersHelper.update(userId, { email });

    return {
      message: 'Your email address has been updated successfully.',
    };
  }

  // ─── Elevation (Attendee → Organizer) ────────────────────────────────────

  /**
   * Attendee submits a request to become an organizer.
   * Only one pending request allowed at a time.
   */
  async requestElevation(userId: string, reason: string) {
    const existing = await this.prisma.elevationRequest.findUnique({
      where: { userId },
    });

    if (existing && existing.status === 'PENDING')
      throw new ConflictException(
        'You already have a pending elevation request',
      );

    // if previously rejected, allow them to reapply by upserting
    return this.prisma.elevationRequest.upsert({
      where: { userId },
      create: { userId, reason },
      update: { reason, status: 'PENDING', reviewedAt: null, reviewNote: null },
    });
  }

  async elevationRequest(userId: string) {
    const [requests, timezone] = await Promise.all([
      this.prisma.elevationRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      this.getUserTimezone(userId),
    ]);

    return {
      requests: requests.map((r) => ({
        ...this.usersHelper.mapRequest(r, timezone),
      })),
    };
  }

  /**
   * Returns all events belonging to the authenticated organizer.
   * Supports filtering by status and pagination.
   */
  async getMyEvents(organizerId: string, query: GetMyEventsDto) {
    const [timezone, total] = await Promise.all([
      this.getUserTimezone(organizerId),
      this.prisma.events.count({
        where: {
          organizerId,
          ...(query.status && { status: query.status }),
        },
      }),
    ]);

    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(50, Math.max(1, query.per_page ?? 20));
    const skip = (page - 1) * perPage;

    const where = {
      organizerId,
      ...(query.status && { status: query.status }),
    };

    const events = await this.prisma.events.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        tickets: true,
        _count: {
          select: {
            orders: {
              where: { status: OrderStatus.CONFIRMED },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(total / perPage);

    return {
      events: events.map((e) => ({
        ...mapEvent(e, timezone),
        confirmed_orders: e._count.orders,
      })),
      pagination: {
        current_page: page,
        per_page: perPage,
        total_items: total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Returns all orders for the authenticated user.
   */
  async getMyOrders(userId: string) {
    return this.prisma.orders.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            endDate: true,
            location: true,
            bannerURL: true,
          },
        },
        items: {
          include: {
            ticket: { select: { id: true, name: true, price: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
