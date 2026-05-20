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

  // ─── get-profile ──────────────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  async userProfile(@Req() req) {
    const data = await this.usersService.userProfile(req.user.email);
    return successResponse(data);
  }

  // ─── edit-profile ──────────────────────────────────────────────────────────────

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async editProfile(@Req() req, @Body() dto: EditProfileDto) {
    const data = await this.usersService.editProfile(dto, req.user.email);
    return successResponse(data);
  }

  // ─── update-profile-photo ──────────────────────────────────────────────────────────────

  @Patch('profile-photo')
  @HttpCode(HttpStatus.OK)
  async updateProfilePhoto(@Req() req, @Body() dto: UpdateProfilePhotoDto) {
    const data = await this.usersService.updateProfilePhoto(
      dto,
      req.user.email,
    );
    return successResponse(data);
  }

  // ─── change-password ──────────────────────────────────────────────────────────────

  @Put('change-password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const data = await this.usersService.changePassword(dto, req.user.email);
    return successResponse(data);
  }

  // ─── update-email ──────────────────────────────────────────────────────────────

  @Patch('email')
  @HttpCode(HttpStatus.OK)
  async requestEmailUpdate(@Req() req, @Body() dto: UpdateEmailDto) {
    const data = await this.usersService.requestEmailUpdate(
      dto,
      req.user.email,
    );
    return successResponse(data);
  }

  // ─── confirm-email-change (public — called from email link) ──────────────────────────────────────────────────────────────

  @Get('confirm-email-change')
  @HttpCode(HttpStatus.OK)
  async confirmEmailChange(@Query('token') token: string) {
    const data = await this.usersService.confirmEmailChange(token);
    return successResponse(data);
  }

  @Post('elevation-request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ATTENDEE)
  @HttpCode(201)
  async requestElevation(@Body() dto: RequestElevationDto, @Req() req) {
    return successResponse(
      await this.usersService.requestElevation(req.user.id, dto.reason),
    );
  }

  @Get('events')
  @HttpCode(HttpStatus.OK)
  async getMyEvents(@Query() query: GetMyEventsDto, @Req() req) {
    return successResponse(
      await this.usersService.getMyEvents(req.user.id, query),
    );
  }
}
