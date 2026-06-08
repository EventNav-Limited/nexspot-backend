import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventsDiscoveryService } from '../services/events-discovery.service.js';
import { OptionalJwtAuthGuard } from '../../auth/guard/optional-jwt-auth.guard.js';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard.js';
import { successResponse } from '../../lib/response.lib.js';
import { GetEventsDto } from '../dto/get-events.dto.js';

@Controller('events')
export class EventsDiscoveryController {
  constructor(private readonly eventsDiscoveryService: EventsDiscoveryService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getEvents(@Query() dto: GetEventsDto, @Req() req) {
    return successResponse(
      await this.eventsDiscoveryService.getEvents(dto, req.user?.id),
    );
  }

  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getRecommendedEvents(@Req() req) {
    return successResponse(
      await this.eventsDiscoveryService.getRecommendedEvents(req.user.id),
    );
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getEvent(
    @Param('slug') slug: string,
    @Req() req,
  ) {
    return successResponse(
      await this.eventsDiscoveryService.getEventBySlug(
        slug,
        req.user?.id,
      ),
    );
  }
}
