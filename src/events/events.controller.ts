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
   * Return a paginated list of published events with optional filtering
   * and sorting. No authentication required.
   *
   * @route GET /events
   *
   * @param query - { q?, location?, price?, date?, date_from?, date_to?,
   *                  category_id?, format_id?, sort?, page?, per_page? }
   *
   * @returns {SuccessResponse<{ events: Event[]; pagination: Pagination; applied_filters: object }>}
   */
  @Get()
  async getEvents(@Query() query: GetEventsDto) {
    return successResponse(await this.eventsService.getEvents(query));
  }

  /**
   * Return a single published event by its URL slug.
   *
   * @route GET /events/:slug
   *
   * @param slug - URL-safe event slug (e.g. 'lagos-tech-meetup-abc123')
   *
   * @returns {SuccessResponse<Event>}
   *
   * @throws {404} NOT_FOUND - Event does not exist or is not published
   */
  @Get(':slug')
  async getEvent(@Param('slug') slug: string) {
    return successResponse(await this.eventsService.getEvent(slug));
  }

  /**
   * Create a new event in DRAFT status. Only organizers can call this.
   *
   * @route POST /events
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param dto - { title, startDate, endDate, deliveryMode, categoryId, formatId,
   *               description?, capacity?, bannerURL?, location?, latitude?,
   *               longitude?, onlineLink? }
   *
   * @returns {SuccessResponse<Event>}
   *
   * @throws {400} BAD_REQUEST - endDate is not after startDate
   * @throws {400} BAD_REQUEST - ONLINE event is missing onlineLink
   * @throws {400} BAD_REQUEST - IN_PERSON event is missing location
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Insufficient role (ORGANIZER required)
   */
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
   * Update fields on an existing event. Only the owning organizer may update.
   * All body fields are optional — only provided fields are changed.
   * Cannot update CANCELLED or COMPLETED events.
   *
   * @route PATCH /events/:id
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param id  - Event UUID
   * @param dto - Partial subset of event fields to update
   *
   * @returns {SuccessResponse<Event>}
   *
   * @throws {400} BAD_REQUEST - Event is CANCELLED or COMPLETED
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Authenticated user does not own this event
   * @throws {404} NOT_FOUND - Event not found
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
   * Explicitly save the current event state as DRAFT. No-op if the event
   * is already in DRAFT status — returns current state unchanged.
   * Cannot save as draft if the event is PUBLISHED, CANCELLED, or COMPLETED.
   *
   * @route POST /events/:id/save-draft
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param id - Event UUID
   *
   * @returns {SuccessResponse<Event>}
   *
   * @throws {400} BAD_REQUEST - Event is not in DRAFT status
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Authenticated user does not own this event
   * @throws {404} NOT_FOUND - Event not found
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Post(':id/save-draft')
  async saveDraft(@Param('id') id: string, @Req() req) {
    return successResponse(await this.eventsService.saveDraft(req.user.id, id));
  }

  /**
   * Return published IN_PERSON and HYBRID events within a radius of the
   * given coordinates, ordered by distance ascending (Haversine formula).
   * Provide lat/lng directly, or authenticate and rely on the saved contact
   * coordinates from the user's profile.
   *
   * @route GET /events/near-me
   * @security BearerAuth (optional — required only when lat/lng are omitted)
   *
   * @param query - { lat?, lng?, radius? (km, default 10, max 100), page?, per_page? }
   *
   * @returns {SuccessResponse<{ events: NearMeEvent[]; pagination: Pagination; coordinates_used: { lat, lng } }>}
   *
   * @throws {400} BAD_REQUEST - No lat/lng provided and user has no saved coordinates
   * @throws {401} UNAUTHORIZED - No lat/lng provided and no auth token
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
   * Set the ticketing configuration for an event. Atomically replaces all
   * existing ticket tiers. FREE events get a single free tier; PAID events
   * require an explicit tiers array. Blocked if any existing tier has sales.
   *
   * @route PUT /events/:id/ticketing
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param id  - Event UUID
   * @param dto - { type: 'free'|'paid', tiers?: TicketTierDto[] }
   *
   * @returns {SuccessResponse<Event>}
   *
   * @throws {400} BAD_REQUEST - One or more existing tiers already have sales
   * @throws {400} BAD_REQUEST - Event is COMPLETED or CANCELLED
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Authenticated user does not own this event
   * @throws {404} NOT_FOUND - Event not found
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
   * Return the full event object plus a completeness check. isComplete is
   * true only when all required fields are present and valid. missingFields
   * lists exactly what is blocking publication.
   *
   * @route GET /events/:id/review
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param id - Event UUID
   *
   * @returns {SuccessResponse<Event & { isComplete: boolean; missingFields: string[] }>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Authenticated user does not own this event
   * @throws {404} NOT_FOUND - Event not found
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
   * Publish a DRAFT event, making it publicly visible. Requires at least
   * one ticket type to be configured before publishing.
   *
   * @route POST /events/:id/publish
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param id - Event UUID
   *
   * @returns {SuccessResponse<Event>}
   *
   * @throws {400} BAD_REQUEST - Event is not in DRAFT status
   * @throws {400} BAD_REQUEST - No ticket types configured
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Authenticated user does not own this event
   * @throws {404} NOT_FOUND - Event not found
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
   * Permanently delete a DRAFT event. Cannot delete PUBLISHED, CANCELLED,
   * or COMPLETED events.
   *
   * @route DELETE /events/:id
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param id - Event UUID
   *
   * @returns 204 No Content
   *
   * @throws {400} BAD_REQUEST - Event is not in DRAFT status
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Authenticated user does not own this event
   * @throws {404} NOT_FOUND - Event not found
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Delete(':id')
  @HttpCode(204)
  async deleteEvent(@Param('id') id: string, @Req() req) {
    await this.eventsService.deleteEvent(req.user.id, id);
  }

  /**
   * Add a new ticket type to an event. Use this for incremental additions;
   * use PUT /events/:id/ticketing to replace all tiers at once.
   * Can only add tickets to DRAFT or PUBLISHED events.
   *
   * @route POST /events/:id/tickets
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param id  - Event UUID
   * @param dto - { name, price, quantity }
   *
   * @returns {SuccessResponse<Ticket>}
   *
   * @throws {400} BAD_REQUEST - Event is CANCELLED or COMPLETED
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Authenticated user does not own this event
   * @throws {404} NOT_FOUND - Event not found
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
   * Update a ticket type. Cannot reduce quantity below the number of
   * tickets already sold.
   *
   * @route PATCH /events/:eventId/tickets/:ticketId
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param ticketId - Ticket UUID
   * @param dto      - Partial subset of ticket fields { name?, price?, quantity? }
   *
   * @returns {SuccessResponse<Ticket>}
   *
   * @throws {400} BAD_REQUEST - New quantity is less than the number already sold
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Authenticated user does not own this ticket's event
   * @throws {404} NOT_FOUND - Ticket not found
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
   * Delete a ticket type. Blocked if any tickets of this type have already
   * been sold.
   *
   * @route DELETE /events/:eventId/tickets/:ticketId
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param ticketId - Ticket UUID
   *
   * @returns 204 No Content
   *
   * @throws {400} BAD_REQUEST - Tickets of this type have already been sold
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Authenticated user does not own this ticket's event
   * @throws {404} NOT_FOUND - Ticket not found
   */
  @Delete(':eventId/tickets/:ticketId')
  @HttpCode(204)
  async deleteTicket(@Param('ticketId') ticketId: string, @Req() req) {
    await this.eventsService.deleteTicket(req.user.id, ticketId);
  }
}
