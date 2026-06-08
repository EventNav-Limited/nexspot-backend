import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { successResponse } from '../lib/response.lib.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a PENDING order and immediately reserve the requested tickets.
   * Ticket availability is decremented at this point. Payment is expected
   * to follow; stale PENDING orders are cleaned up by a scheduled job.
   *
   * @route POST /orders
   * @security BearerAuth
   *
   * @param dto - { eventId, items: [{ ticketId, quantity }] }
   *
   * @returns {SuccessResponse<Order>}
   *
   * @throws {400} BAD_REQUEST - A ticket does not belong to this event
   * @throws {400} BAD_REQUEST - Requested quantity exceeds available stock
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {404} NOT_FOUND - Event not found or not published
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() dto: CreateOrderDto, @Req() req) {
    return successResponse(
      await this.ordersService.createOrder(req.user.id, dto),
    );
  }

  /**
   * Confirm a PENDING order after successful payment. Stores the payment
   * gateway transaction reference and moves the order status to CONFIRMED.
   *
   * @route POST /orders/:id/confirm
   * @security BearerAuth
   *
   * @param id               - Order UUID
   * @param paymentReference - Payment gateway transaction reference (body field)
   *
   * @returns {SuccessResponse<Order>}
   *
   * @throws {400} BAD_REQUEST - Order is not in PENDING status
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {404} NOT_FOUND - Order not found
   */
  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmOrder(
    @Param('id') id: string,
    @Body('paymentReference') paymentReference: string,
    @Req() req,
  ) {
    return successResponse(
      await this.ordersService.confirmOrder(req.user.id, id, paymentReference),
    );
  }

  /**
   * Cancel a PENDING order and release the reserved tickets back to
   * availability. Only PENDING orders can be self-cancelled — CONFIRMED
   * orders require a separate refund flow.
   *
   * @route POST /orders/:id/cancel
   * @security BearerAuth
   *
   * @param id - Order UUID
   *
   * @returns {SuccessResponse<null>}
   *
   * @throws {400} BAD_REQUEST - Order is not in PENDING status
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Authenticated user does not own this order
   * @throws {404} NOT_FOUND - Order not found
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(@Param('id') id: string, @Req() req) {
    await this.ordersService.cancelOrder(req.user.id, id);
    return successResponse(null);
  }
}
