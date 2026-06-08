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
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventsManagementService } from '../services/events-management.service.js';
import { RolesGuard } from '../../auth/guard/role.guard.js';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/client.js';
import { CreateEventDto } from '../dto/create-event.dto.js';
import { UpdateEventDto } from '../dto/update-event.dto.js';
import { successResponse } from '../../lib/response.lib.js';

@Controller('events')
export class EventsManagementController {
  constructor(
    private readonly eventsManagementService: EventsManagementService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ORGANIZER)
  @Post()
  async create(@Req() req, @Body() createEventDto: CreateEventDto) {
    const data = await this.eventsManagementService.createEvent(
      req.user.id,
      createEventDto,
    );
    return successResponse(data);
  }

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
      await this.eventsManagementService.updateEvent(req.user.id, id, dto),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Post(':id/save-draft')
  async saveDraft(@Param('id') id: string, @Req() req) {
    return successResponse(
      await this.eventsManagementService.saveDraft(req.user.id, id),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Get(':id/review')
  async reviewEvent(@Param('id') id: string, @Req() req) {
    return successResponse(
      await this.eventsManagementService.reviewEvent(req.user.id, id),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Post(':id/publish')
  async publishEvent(@Param('id') id: string, @Req() req) {
    return successResponse(
      await this.eventsManagementService.publishEvent(req.user.id, id),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORGANIZER)
  @Delete(':id')
  @HttpCode(204)
  async deleteEvent(@Param('id') id: string, @Req() req) {
    await this.eventsManagementService.deleteEvent(req.user.id, id);
  }
}
