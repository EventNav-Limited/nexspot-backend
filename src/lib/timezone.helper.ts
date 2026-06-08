import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service.js';
import { getTimezoneFromLocation } from './timezone.lib.js';

/**
 * Shared injectable that resolves an IANA timezone for a user.
 *
 * Priority:
 * 1. Stored `Contact.timezone` (set at onboarding)
 * 2. Derived from `Contact.city` + `Contact.country`
 * 3. Falls back to 'UTC'
 */
@Injectable()
export class TimezoneHelper {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the IANA timezone string for an authenticated user. */
  async forUser(userId: string): Promise<string> {
    const contact = await this.prisma.contact.findUnique({
      where: { userId },
      select: { timezone: true, city: true, country: true },
    });
    if (contact?.timezone) return contact.timezone;
    return getTimezoneFromLocation(contact?.city, contact?.country);
  }

  /** Returns viewer timezone for optional-auth routes. 'UTC' when unauthenticated. */
  async forOptionalUser(userId?: string | null): Promise<string> {
    if (!userId) return 'UTC';
    return this.forUser(userId);
  }
}
