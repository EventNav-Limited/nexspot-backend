import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service.js';
import { CreateTicketDto } from '../dto/create-ticket.dto.js';
import { EventStatus } from '../../generated/prisma/enums.js';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../lib/error.lib.js';
import { TimezoneHelper } from '../../lib/timezone.helper.js';

@Injectable()
export class EventsTicketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timezoneHelper: TimezoneHelper,
  ) {}

  async createTicket(
    organizerId: string,
    eventId: string,
    dto: CreateTicketDto,
  ) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (event.status !== EventStatus.DRAFT)
      throw new BadRequestException('Can only add tickets to draft events');

    const totalTickets = await this.prisma.tickets.aggregate({
      where: { eventId },
      _sum: { quantity: true },
    });
    const currentTotal = totalTickets._sum.quantity || 0;
    if (event.capacity && currentTotal + dto.quantity > event.capacity) {
      throw new BadRequestException(
        `Ticket quantity exceeds event capacity (${event.capacity})`,
      );
    }

    return this.prisma.tickets.create({
      data: {
        eventId,
        name: dto.name,
        price: dto.price,
        quantity: dto.quantity,
      },
    });
  }

  async deleteTicket(organizerId: string, eventId: string, ticketId: string) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (event.status !== EventStatus.DRAFT)
      throw new BadRequestException(
        'Can only remove tickets from draft events',
      );

    const ticket = await this.prisma.tickets.findUnique({
      where: { id: ticketId },
    });
    if (!ticket || ticket.eventId !== eventId)
      throw new NotFoundException('Ticket not found on this event');

    await this.prisma.tickets.delete({ where: { id: ticketId } });
  }

  async getEventTickets(eventId: string, userId?: string) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      include: { tickets: true },
    });

    if (!event) throw new NotFoundException('Event not found');

    if (
      event.status !== EventStatus.PUBLISHED &&
      event.organizerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view these tickets',
      );
    }

    return event.tickets;
  }
}
