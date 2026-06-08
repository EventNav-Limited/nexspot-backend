import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service.js';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../lib/error.lib.js';
import { EventStatus, OrderStatus } from '../../generated/prisma/enums.js';
import { CreateOrderDto } from '../dto/create-order.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Orders (Attendee) ────────────────────────────────────────────────────

  /**
   * Creates a PENDING order and reserves tickets.
   * Tickets are deducted from availability immediately.
   * If payment is not completed, a cleanup job should cancel stale pending orders.
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    const event = await this.prisma.events.findUnique({
      where: { id: dto.eventId },
      include: { tickets: true },
    });

    if (!event || event.status !== EventStatus.PUBLISHED)
      throw new NotFoundException('Event not found');

    // validate all ticket IDs belong to this event and have availability
    for (const item of dto.items) {
      const ticket = event.tickets.find((t) => t.id === item.ticketId);

      if (!ticket)
        throw new BadRequestException(
          `Ticket ${item.ticketId} does not belong to this event`,
        );

      const available = ticket.quantity - ticket.sold;
      if (item.quantity > available)
        throw new BadRequestException(
          `Only ${available} tickets remaining for ${ticket.name}`,
        );
    }

    // calculate total
    const total = dto.items.reduce((sum, item) => {
      const ticket = event.tickets.find((t) => t.id === item.ticketId)!;
      return sum + Number(ticket.price) * item.quantity;
    }, 0);

    // create order and reserve tickets in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.orders.create({
        data: {
          userId,
          eventId: dto.eventId,
          total,
          status: OrderStatus.PENDING,
          items: {
            create: dto.items.map((item) => {
              const ticket = event.tickets.find((t) => t.id === item.ticketId)!;
              return {
                ticketId: item.ticketId,
                quantity: item.quantity,
                price: ticket.price, // snapshot price at time of purchase
              };
            }),
          },
        },
        include: { items: true },
      });

      // increment sold count for each ticket type
      await Promise.all(
        dto.items.map((item) =>
          tx.tickets.update({
            where: { id: item.ticketId },
            data: { sold: { increment: item.quantity } },
          }),
        ),
      );

      return newOrder;
    });

    return order;
  }

  /**
   * Confirms an order after successful payment.
   * Stores the payment gateway reference.
   */
  async confirmOrder(
    userId: string,
    orderId: string,
    paymentReference: string,
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { ticket: true } },
        event: true,
        user: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId)
      throw new ForbiddenException('You do not own this order');
    if (order.status !== OrderStatus.PENDING)
      throw new BadRequestException('Order is not in a pending state');

    const confirmed = await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        paymentReference,
      },
      include: { items: { include: { ticket: true } }, event: true },
    });

    // TODO: send ticket confirmation email to user

    return confirmed;
  }

  /**
   * Cancels a PENDING order and releases the reserved tickets back.
   * Confirmed orders cannot be self-cancelled — use a refund flow instead.
   */
  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId)
      throw new ForbiddenException('You do not own this order');
    if (order.status !== OrderStatus.PENDING)
      throw new BadRequestException('Only pending orders can be cancelled');

    // cancel order and release tickets in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.orders.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      // release reserved tickets back to availability
      await Promise.all(
        order.items.map((item) =>
          tx.tickets.update({
            where: { id: item.ticketId },
            data: { sold: { decrement: item.quantity } },
          }),
        ),
      );
    });
  }
}
