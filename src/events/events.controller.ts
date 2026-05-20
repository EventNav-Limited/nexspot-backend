import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service.js';
import { RolesGuard } from '../auth/guard/role.guard.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { successResponse } from '../lib/response.lib.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { GetEventsDto } from './dto/get-events.dto.js';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}
  /**
   * GET /events
   * Returns paginated published events with optional filters.
   */
  @Get()
  async getEvents(@Query() query: GetEventsDto) {
    return successResponse(await this.eventsService.getEvents(query));
  }

  /**
   * GET /events/:slug
   * Returns a single published event by slug.
   */
  @Get(':slug')
  async getEvent(@Param('slug') slug: string) {
    return successResponse(await this.eventsService.getEvent(slug));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ORGANIZER)
  @Post()
  async create(@Req() req, @Body() createEventDto: CreateEventDto) {
    const data = await this.eventsService.createEvent(
      req.user.id,
      createEventDto,
    );
    return successResponse(data);
  }

  /**
   * POST /events/:id/publish
   * Publishes a DRAFT event.
   * Requires ORGANIZER role and ownership.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Post(':id/publish')
  async publishEvent(@Param('id') id: string, @Req() req) {
    return successResponse(
      await this.eventsService.publishEvent(req.user.id, id),
    );
  }

  // ─── Ticket Management (Organizer) ──────────────────────────────────────

  /**
   * POST /events/:id/tickets
   * Adds a ticket type to an event.
   * Requires ORGANIZER role and ownership.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ORGANIZER)
  @Post(':id/tickets')
  async addTicket(
    @Param('id') id: string,
    @Body() dto: CreateTicketDto,
    @Req() req,
  ) {
    return successResponse(
      await this.eventsService.addTicket(req.user.id, id, dto),
    );
  }
}
