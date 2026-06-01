import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
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
import { UpdateEventDto } from './dto/update-event.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { SetTicketingDto } from './dto/set-ticketing.dto.js';

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
   * PATCH /events/:id
   * Updates an existing event.
   * Requires ORGANIZER role and ownership.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Patch(':id')
  async updateEvent(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Req() req,
  ) {
    return successResponse(
      await this.eventsService.updateEvent(req.user.id, id, dto),
    );
  }

  /**
   * POST /events/:id/save-draft
   * Explicitly saves current state as DRAFT.
   * No-op if already a DRAFT.
   * Requires ORGANIZER role and ownership.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Post(':id/save-draft')
  async saveDraft(@Param('id') id: string, @Req() req) {
    return successResponse(await this.eventsService.saveDraft(req.user.id, id));
  }

  /**
   * GET /events/near-me
   * Returns published in-person and hybrid events within a radius of the
   * provided coordinates. Falls back to the user's saved contact coordinates
   * if authenticated and no lat/lng is provided.
   * Optional query params: lat, lng, radius (km), page, per_page.
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('near-me')
  async getEventsNearMe(@Query() query: GetEventsNearMeDto, @Req() req) {
    // userId is null if the user is not authenticated
    const userId = req.user?.id ?? null;
    return successResponse(
      await this.eventsService.getEventsNearMe(userId, query),
    );
  }

  /**
   * PUT /events/:id/ticketing
   * Sets ticketing configuration — free or paid with tiers.
   * Replaces all existing ticket tiers (blocked if any have sales).
   * Requires ORGANIZER role and ownership.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Put(':id/ticketing')
  async setTicketing(
    @Param('id') id: string,
    @Body() dto: SetTicketingDto,
    @Req() req,
  ) {
    return successResponse(
      await this.eventsService.setTicketing(req.user.id, id, dto),
    );
  }

  /**
   * GET /events/:id/review
   * Returns full event object with isComplete and missingFields.
   * Requires ORGANIZER role and ownership.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Get(':id/review')
  async reviewEvent(@Param('id') id: string, @Req() req) {
    return successResponse(
      await this.eventsService.reviewEvent(req.user.id, id),
    );
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

  /**
   * DELETE /events/:id
   * Deletes a DRAFT event permanently.
   * Requires ORGANIZER role and ownership.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Delete(':id')
  @HttpCode(204)
  async deleteEvent(@Param('id') id: string, @Req() req) {
    await this.eventsService.deleteEvent(req.user.id, id);
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

  /**
   * PATCH /events/:eventId/tickets/:ticketId
   * Updates a ticket type.
   * Requires ORGANIZER role and ownership.
   */
  @Patch(':eventId/tickets/:ticketId')
  async updateTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateTicketDto,
    @Req() req,
  ) {
    return successResponse(
      await this.eventsService.updateTicket(req.user.id, ticketId, dto),
    );
  }

  /**
   * DELETE /events/:eventId/tickets/:ticketId
   * Deletes a ticket type.
   * Requires ORGANIZER role and ownership.
   */
  @Delete(':eventId/tickets/:ticketId')
  @HttpCode(204)
  async deleteTicket(@Param('ticketId') ticketId: string, @Req() req) {
    await this.eventsService.deleteTicket(req.user.id, ticketId);
  }
}
