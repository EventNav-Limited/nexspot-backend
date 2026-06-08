import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersElevationService } from '../services/users-elevation.service.js';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard.js';
import { successResponse } from '../../lib/response.lib.js';
import { RequestElevationDto } from '../dto/request-elevation.dto.js';
import { Role } from '../../generated/prisma/enums.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/guard/role.guard.js';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersElevationController {
  constructor(private usersElevationService: UsersElevationService) {}

  @Post('elevation-request')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ATTENDEE)
  async requestElevation(@Body() dto: RequestElevationDto, @Req() req) {
    return successResponse(
      await this.usersElevationService.requestElevation(
        req.user.id,
        dto.reason,
      ),
    );
  }

  @Get('elevation-request')
  @HttpCode(HttpStatus.OK)
  async getElevationRequest(@Req() req) {
    return successResponse(
      await this.usersElevationService.elevationRequest(req.user.id),
    );
  }
}
