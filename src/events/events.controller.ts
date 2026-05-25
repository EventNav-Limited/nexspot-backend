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
import { GetEventsNearMeDto } from './dto/get-events-near-me.dto.js';

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
   * GET /events/near-me
   * Returns published in-person and hybrid events within a radius of the
   * provided coordinates. Falls back to the user's saved contact coordinates
   * if authenticated and no lat/lng is provided.
   * Optional query params: lat, lng, radius (km), page, per_page.
   */
  @Get('near-me')
  async getEventsNearMe(@Query() query: GetEventsNearMeDto, @Req() req) {
    // userId is null if the user is not authenticated
    const userId = req.user?.id ?? null;
    return successResponse(
      await this.eventsService.getEventsNearMe(userId, query),
    );
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
