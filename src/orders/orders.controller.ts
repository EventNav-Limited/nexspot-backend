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
   * POST /orders
   * Creates a PENDING order and reserves tickets.
   * Requires authenticated user.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() dto: CreateOrderDto, @Req() req) {
    return successResponse(
      await this.ordersService.createOrder(req.user.id, dto),
    );
  }

  /**
   * POST /orders/:id/confirm
   * Confirms an order after successful payment.
   * Accepts a payment reference from the payment gateway.
   */
  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmOrder(
    @Param('id') id: string,
    @Body('paymentReference') paymentReference: string,
  ) {
    return successResponse(
      await this.ordersService.confirmOrder(id, paymentReference),
    );
  }

  /**
   * POST /orders/:id/cancel
   * Cancels a PENDING order and releases reserved tickets.
   * Requires ownership.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(@Param('id') id: string, @Req() req) {
    await this.ordersService.cancelOrder(req.user.id, id);
    return successResponse(null);
  }
}
