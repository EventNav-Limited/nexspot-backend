import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { successResponse } from '../lib/response.lib.js';
import { RejectElevationDto } from './dto/review-elevation.dto.js';
import { Role } from '../generated/prisma/enums.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guard/role.guard.js';

@Controller('admin')
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /elevation
   * Admin fetches all elevation requests.
   * Optionally filter by status via ?status=PENDING|APPROVED|REJECTED
   * Requires ADMIN role.
   */
  @Get('elevation-requests')
  @HttpCode(HttpStatus.OK)
  async getElevationRequests(
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return successResponse(
      await this.adminService.getElevationRequests(status),
    );
  }

  /**
   * PATCH /elevation/:id/approve
   * Admin approves an elevation request.
   * Requires ADMIN role.
   */
  @Patch('elevation-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveElevation(@Param('id') id: string) {
    await this.adminService.approveElevation(id);
    return successResponse(null);
  }

  /**
   * PATCH /elevation/:id/reject
   * Admin rejects an elevation request with an optional note.
   * Requires ADMIN role.
   */
  @Patch('elevation-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectElevation(
    @Param('id') id: string,
    @Body() dto: RejectElevationDto,
  ) {
    await this.adminService.rejectElevation(id, dto.reviewNote);
    return successResponse(null);
  }
}
