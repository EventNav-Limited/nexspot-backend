import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { successResponse } from '../lib/response.lib.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { EditProfileDto } from './dto/edit-profile.dto.js';
import { UpdateProfilePhotoDto } from './dto/update-profile-photo.dto.js';
import { UpdateEmailDto } from './dto/update-email.dto.js';
import { RequestElevationDto } from './dto/request-elevation.dto.js';
import { GetMyEventsDto } from './dto/get-my-events.dto.js';
import { Role } from '../generated/prisma/enums.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guard/role.guard.js';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * Return the authenticated user's profile.
   *
   * @route GET /me
   * @security BearerAuth
   *
   * @returns {SuccessResponse<User>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async userProfile(@Req() req) {
    const data = await this.usersService.userProfile(req.user.email);
    return successResponse(data);
  }

  /**
   * Update the authenticated user's display name. All fields are optional;
   * only provided fields are changed.
   *
   * @route PATCH /me/profile
   * @security BearerAuth
   *
   * @param dto - { firstName?, lastName? }
   *
   * @returns {SuccessResponse<User>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async editProfile(@Req() req, @Body() dto: EditProfileDto) {
    const data = await this.usersService.editProfile(dto, req.user.email);
    return successResponse(data);
  }

  /**
   * Update the authenticated user's profile photo URL.
   *
   * @route PATCH /me/profile-photo
   * @security BearerAuth
   *
   * @param dto - { profilePhotoURL } — must be a valid URL
   *
   * @returns {SuccessResponse<User>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Patch('profile-photo')
  @HttpCode(HttpStatus.OK)
  async updateProfilePhoto(@Req() req, @Body() dto: UpdateProfilePhotoDto) {
    const data = await this.usersService.updateProfilePhoto(
      dto,
      req.user.email,
    );
    return successResponse(data);
  }

  /**
   * Change the authenticated user's password. Requires the current password
   * for verification. Google accounts cannot use this endpoint.
   *
   * @route PUT /me/change-password
   * @security BearerAuth
   *
   * @param dto - { oldPassword, password } — both min 8 characters
   *
   * @returns {SuccessResponse<{ message: string }>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {401} UNAUTHORIZED - Current password is incorrect
   * @throws {401} UNAUTHORIZED - Account uses Google sign-in
   */
  @Put('change-password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const data = await this.usersService.changePassword(dto, req.user.email);
    return successResponse(data);
  }

  /**
   * Initiate an email address change. Sends a verification link to the
   * new email address. Only LOCAL accounts can change their email.
   *
   * @route PATCH /me/email
   * @security BearerAuth
   *
   * @param dto - { newEmail, password } — current password required for verification
   *
   * @returns {SuccessResponse<{ message: string }>}
   *
   * @throws {400} BAD_REQUEST - Cannot change email for Google accounts
   * @throws {400} BAD_REQUEST - New email is already in use
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {401} UNAUTHORIZED - Current password is incorrect
   */
  @Patch('email')
  @HttpCode(HttpStatus.OK)
  async requestEmailUpdate(@Req() req, @Body() dto: UpdateEmailDto) {
    const data = await this.usersService.requestEmailUpdate(
      dto,
      req.user.email,
    );
    return successResponse(data);
  }

  /**
   * Complete an email address change after the user clicks the verification
   * link sent to their new email address.
   *
   * @route GET /me/confirm-email-change
   * @security BearerAuth
   *
   * @param token - Signed email-change token from the verification link
   *
   * @returns {SuccessResponse<{ message: string }>}
   *
   * @throws {400} BAD_REQUEST - Invalid token purpose
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Get('confirm-email-change')
  @HttpCode(HttpStatus.OK)
  async confirmEmailChange(@Query('token') token: string) {
    const data = await this.usersService.confirmEmailChange(token);
    return successResponse(data);
  }

  /**
   * Submit a request for the authenticated ATTENDEE to be promoted to
   * ORGANIZER. Only one PENDING request is allowed per user at a time.
   * A previously REJECTED request may be resubmitted.
   *
   * @route POST /me/elevation-request
   * @security BearerAuth
   * @role ATTENDEE
   *
   * @param dto - { reason } — minimum 20 characters
   *
   * @returns {SuccessResponse<ElevationRequest>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Insufficient role (ATTENDEE required)
   * @throws {409} CONFLICT - A PENDING elevation request already exists
   */
  @Post('elevation-request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ATTENDEE)
  async requestElevation(@Body() dto: RequestElevationDto, @Req() req) {
    return successResponse(
      await this.usersService.requestElevation(req.user.id, dto.reason),
    );
  }

  /**
   * Return the authenticated user's own elevation request(s), ordered
   * oldest first. A user can only ever have one request at a time (upserted
   * on each submission), so the array will contain at most one entry.
   *
   * @route GET /me/elevation-request
   * @security BearerAuth
   *
   * @returns {SuccessResponse<{ requests: ElevationRequest[] }>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Get('elevation-request')
  @HttpCode(HttpStatus.OK)
  async getElevationRequest(@Req() req) {
    return successResponse(
      await this.usersService.elevationRequest(req.user.id),
    );
  }

  /**
   * Return the authenticated organizer's own events. Supports filtering by
   * status and pagination. Each event includes a confirmed_orders count.
   *
   * @route GET /me/events
   * @security BearerAuth
   * @role ORGANIZER
   *
   * @param query - { status?: EventStatus, page?, per_page? }
   *
   * @returns {SuccessResponse<{ events: Event[]; pagination: Pagination }>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Insufficient role (ORGANIZER required)
   */
  @Get('events')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER)
  async getMyEvents(@Query() query: GetMyEventsDto, @Req() req) {
    return successResponse(
      await this.usersService.getMyEvents(req.user.id, query),
    );
  }

  /**
   * Return all orders placed by the authenticated user, ordered by most
   * recent first. Includes event details and ticket line items.
   *
   * @route GET /me/orders
   * @security BearerAuth
   *
   * @returns {SuccessResponse<Order[]>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Get('orders')
  @HttpCode(HttpStatus.OK)
  async getMyOrders(@Req() req) {
    return successResponse(await this.usersService.getMyOrders(req.user.id));
  }
}
