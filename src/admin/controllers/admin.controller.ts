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
import { AdminService } from '../services/admin.service.js';
import { successResponse } from '../../lib/response.lib.js';
import { RejectElevationDto } from '../dto/review-elevation.dto.js';
import { Role } from '../../generated/prisma/enums.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guard/role.guard.js';

@Controller('admin')
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Return all organizer elevation requests, optionally filtered by status.
   * Each entry includes the requesting user's profile information.
   *
   * @route GET /admin/elevation-requests
   * @security BearerAuth
   * @role ADMIN
   *
   * @param status - Optional filter: 'PENDING' | 'APPROVED' | 'REJECTED'
   *
   * @returns {SuccessResponse<ElevationRequest[]>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Insufficient role (ADMIN required)
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
   * Approve an elevation request. Atomically promotes the requesting user
   * from ATTENDEE to ORGANIZER and marks the request as APPROVED.
   *
   * @route PATCH /admin/elevation-requests/:id/approve
   * @security BearerAuth
   * @role ADMIN
   *
   * @param id - Elevation request UUID
   *
   * @returns {SuccessResponse<null>}
   *
   * @throws {400} BAD_REQUEST - Request is no longer in PENDING status
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Insufficient role (ADMIN required)
   * @throws {404} NOT_FOUND - Elevation request not found
   */
  @Patch('elevation-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveElevation(@Param('id') id: string) {
    await this.adminService.approveElevation(id);
    return successResponse(null);
  }

  /**
   * Reject an elevation request with an optional review note. The requesting
   * user's role remains ATTENDEE. They may reapply after rejection.
   *
   * @route PATCH /admin/elevation-requests/:id/reject
   * @security BearerAuth
   * @role ADMIN
   *
   * @param id  - Elevation request UUID
   * @param dto - { reviewNote? } — optional note explaining the rejection
   *
   * @returns {SuccessResponse<null>}
   *
   * @throws {400} BAD_REQUEST - Request is no longer in PENDING status
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Insufficient role (ADMIN required)
   * @throws {404} NOT_FOUND - Elevation request not found
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
