import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventsTicketingService } from '../services/events-ticketing.service.js';
import { RolesGuard } from '../../auth/guard/role.guard.js';
import { OptionalJwtAuthGuard } from '../../auth/guard/optional-jwt-auth.guard.js';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/client.js';
import { CreateTicketDto } from '../dto/create-ticket.dto.js';
import { successResponse } from '../../lib/response.lib.js';

@Controller('events')
export class EventsTicketingController {
  constructor(
    private readonly eventsTicketingService: EventsTicketingService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ORGANIZER)
  @Post(':id/tickets')
  async createTicket(
    @Param('id') id: string,
    @Body() dto: CreateTicketDto,
    @Req() req,
  ) {
    return successResponse(
      await this.eventsTicketingService.createTicket(req.user.id, id, dto),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Delete(':id/tickets/:ticketId')
  @HttpCode(204)
  async deleteTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Req() req,
  ) {
    await this.eventsTicketingService.deleteTicket(req.user.id, id, ticketId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/tickets')
  @HttpCode(HttpStatus.OK)
  async getEventTickets(@Param('id') id: string, @Req() req) {
    return successResponse(
      await this.eventsTicketingService.getEventTickets(id, req.user?.id),
    );
  }
}
