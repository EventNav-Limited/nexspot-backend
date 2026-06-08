import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersProfileService } from '../services/users-profile.service.js';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard.js';
import { successResponse } from '../../lib/response.lib.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { EditProfileDto } from '../dto/edit-profile.dto.js';
import { UpdateProfilePhotoDto } from '../dto/update-profile-photo.dto.js';
import { UpdateEmailDto } from '../dto/update-email.dto.js';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersProfileController {
  constructor(private usersProfileService: UsersProfileService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async userProfile(@Req() req) {
    const data = await this.usersProfileService.userProfile(req.user.email);
    return successResponse(data);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async editProfile(@Req() req, @Body() dto: EditProfileDto) {
    const data = await this.usersProfileService.editProfile(dto, req.user.email);
    return successResponse(data);
  }

  @Patch('profile-photo')
  @HttpCode(HttpStatus.OK)
  async updateProfilePhoto(@Req() req, @Body() dto: UpdateProfilePhotoDto) {
    const data = await this.usersProfileService.updateProfilePhoto(
      dto,
      req.user.email,
    );
    return successResponse(data);
  }

  @Put('change-password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const data = await this.usersProfileService.changePassword(
      dto,
      req.user.email,
    );
    return successResponse(data);
  }

  @Patch('email')
  @HttpCode(HttpStatus.OK)
  async requestEmailUpdate(@Req() req, @Body() dto: UpdateEmailDto) {
    const data = await this.usersProfileService.requestEmailUpdate(
      dto,
      req.user.email,
    );
    return successResponse(data);
  }

  @Get('confirm-email-change')
  @HttpCode(HttpStatus.OK)
  async confirmEmailChange(@Query('token') token: string) {
    const data = await this.usersProfileService.confirmEmailChange(token);
    return successResponse(data);
  }
}
