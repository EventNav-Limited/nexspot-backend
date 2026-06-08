import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersActivityService } from '../services/users-activity.service.js';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard.js';
import { successResponse } from '../../lib/response.lib.js';
import { GetMyEventsDto } from '../dto/get-my-events.dto.js';
import { Role } from '../../generated/prisma/enums.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/guard/role.guard.js';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersActivityController {
  constructor(private usersActivityService: UsersActivityService) {}

  @Get('events')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  async getMyEvents(@Query() query: GetMyEventsDto, @Req() req) {
    return successResponse(
      await this.usersActivityService.getMyEvents(req.user.id, query),
    );
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  async getMyOrders(@Req() req) {
    return successResponse(
      await this.usersActivityService.getMyOrders(req.user.id),
    );
  }
}
