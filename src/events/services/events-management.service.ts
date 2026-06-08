import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service.js';
import { CreateEventDto } from '../dto/create-event.dto.js';
import { UpdateEventDto } from '../dto/update-event.dto.js';
import { EventFormat, EventStatus } from '../../generated/prisma/enums.js';
import { generateSlug, mapEvent } from '../event.helpers.js';
import { TimezoneHelper } from '../../lib/timezone.helper.js';
import { localToUTC } from '../../lib/timezone.lib.js';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../lib/error.lib.js';

@Injectable()
export class EventsManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timezoneHelper: TimezoneHelper,
  ) {}

  async createEvent(organizerId: string, dto: CreateEventDto) {
    const timezone = await this.timezoneHelper.forUser(organizerId);

    const startDate = localToUTC(dto.startDate.toISOString(), timezone);
    const endDate = localToUTC(dto.endDate.toISOString(), timezone);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (dto.deliveryMode === EventFormat.ONLINE && !dto.onlineLink) {
      throw new BadRequestException('Online events must have an online link');
    }
    if (dto.deliveryMode === EventFormat.IN_PERSON) {
      if (!dto.location)
        throw new BadRequestException('In-person events must have a location');
      if (dto.latitude == null || dto.longitude == null)
        throw new BadRequestException(
          'In-person events must have latitude and longitude for location-based discovery',
        );
    }
    if (dto.deliveryMode === EventFormat.HYBRID) {
      if (!dto.location)
        throw new BadRequestException(
          'Hybrid events must have a physical location',
        );
      if (!dto.onlineLink)
        throw new BadRequestException('Hybrid events must have an online link');
    }

    const slug = generateSlug(dto.title);

    const event = await this.prisma.events.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        startDate,
        endDate,
        location: dto.location,
        onlineLink: dto.onlineLink,
        capacity: dto.capacity,
        bannerURL: dto.bannerURL,
        deliveryMode: dto.deliveryMode,
        categoryId: dto.categoryId,
        formatId: dto.formatId,
        organizerId,
        status: EventStatus.DRAFT,
      },
      include: { tickets: true, organizer: true },
    });

    return mapEvent(event as any, timezone);
  }

  async updateEvent(organizerId: string, eventId: string, dto: UpdateEventDto) {
    const [event, timezone] = await Promise.all([
      this.prisma.events.findUnique({ where: { id: eventId } }),
      this.timezoneHelper.forUser(organizerId),
    ]);

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (
      event.status != EventStatus.CANCELLED &&
      event.status != EventStatus.COMPLETED
    )
      throw new BadRequestException(
        `Cannot update a ${event.status.toLowerCase()} event`,
      );

    const dateOverrides: Record<string, Date> = {};
    if (dto.startDate)
      dateOverrides.startDate = localToUTC(
        dto.startDate.toISOString(),
        timezone,
      );
    if (dto.endDate)
      dateOverrides.endDate = localToUTC(dto.endDate.toISOString(), timezone);

    const updated = await this.prisma.events.update({
      where: { id: eventId },
      data: {
        ...dto,
        ...dateOverrides,
        ...(dto.title && { slug: generateSlug(dto.title) }),
      },
      include: { tickets: true, organizer: true },
    });

    return mapEvent(updated as any, timezone);
  }

  async reviewEvent(organizerId: string, eventId: string) {
    const [event, timezone] = await Promise.all([
      this.prisma.events.findUnique({
        where: { id: eventId },
        include: { tickets: true, organizer: true },
      }),
      this.timezoneHelper.forUser(organizerId),
    ]);

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');

    const missingFields: string[] = [];

    if (!event.title) missingFields.push('title');
    if (!event.bannerURL) missingFields.push('banner');
    if (event.tickets.length === 0)
      missingFields.push('at least one ticket type');
    if (!event.startDate || new Date(event.startDate) <= new Date())
      missingFields.push('start date must be in the future');
    if (event.deliveryMode === EventFormat.IN_PERSON && !event.location)
      missingFields.push('location');
    if (event.deliveryMode === EventFormat.ONLINE && !event.onlineLink)
      missingFields.push('online link');

    return {
      ...mapEvent(event as any, timezone),
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }

  async publishEvent(organizerId: string, eventId: string) {
    const [event, timezone] = await Promise.all([
      this.prisma.events.findUnique({
        where: { id: eventId },
        include: { tickets: true },
      }),
      this.timezoneHelper.forUser(organizerId),
    ]);

    if (!event) throw new NotFoundException('Event');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (event.status !== EventStatus.DRAFT)
      throw new BadRequestException('Only draft events can be published');
    if (event.tickets.length === 0)
      throw new BadRequestException(
        'Add at least one ticket type before publishing',
      );

    const updated = await this.prisma.events.update({
      where: { id: eventId },
      data: { status: EventStatus.PUBLISHED },
      include: { tickets: true, organizer: true },
    });

    return mapEvent(updated as any, timezone);
  }

  async saveDraft(organizerId: string, eventId: string) {
    const [event, timezone] = await Promise.all([
      this.prisma.events.findUnique({
        where: { id: eventId },
        include: { tickets: true, organizer: true },
      }),
      this.timezoneHelper.forUser(organizerId),
    ]);

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (event.status !== EventStatus.DRAFT)
      throw new BadRequestException(
        `Cannot save as draft — event is ${event.status.toLowerCase()}`,
      );

    return mapEvent(event as any, timezone);
  }

  async deleteEvent(organizerId: string, eventId: string) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (event.status !== EventStatus.DRAFT)
      throw new BadRequestException('Only draft events can be deleted');

    await this.prisma.events.delete({ where: { id: eventId } });
  }
}
