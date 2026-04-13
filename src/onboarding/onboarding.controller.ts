// src/onboarding/onboarding.controller.ts

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
import { OnboardingService } from './onboarding.service.js';
import { SaveInterestsDto } from './dto/save-interests.dto.js';
import { SaveLocationDto } from './dto/save-location.dto.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { successResponse } from '../lib/response.lib.js';

@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  /**
   * Fetch all available interests for the user to select from.
   *
   * @route GET /onboarding/interests
   * @security BearerAuth
   *
   * @returns {SuccessResponse<Interest[]>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Get('interests')
  async getInterests() {
    const data = await this.onboardingService.getInterests();
    return successResponse(data);
  }

  /**
   * Save the user's interest selections. Intermediate step — does not
   * mark onboarding as complete.
   *
   * @route POST /onboarding/interests
   * @security BearerAuth
   *
   * @param dto - { interest_ids: string[] }
   *
   * @returns {SuccessResponse<null>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {400} VALIDATION_ERROR - interest_ids must be an array of strings
   */
  @Post('interests')
  @HttpCode(HttpStatus.OK)
  saveInterests(@Req() req, @Body() dto: SaveInterestsDto) {
    this.onboardingService.saveInterests(req.user.id, dto);
    return successResponse(null);
  }

  /**
   * Save the user's preferred location and mark onboarding as complete.
   *
   * @route POST /onboarding/location
   * @security BearerAuth
   *
   * @param dto - { city, country, latitude?, longitude? }
   *
   * @returns {SuccessResponse<{ onboarding_completed: true }>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {400} VALIDATION_ERROR - Invalid or missing location fields
   */
  @Post('location')
  @HttpCode(HttpStatus.OK)
  async saveLocation(@Req() req, @Body() dto: SaveLocationDto) {
    const data = await this.onboardingService.saveLocation(req.user.id, dto);
    return successResponse(data);
  }

  /**
   * Skip onboarding entirely and mark it as complete.
   *
   * @route POST /onboarding/skip
   * @security BearerAuth
   *
   * @returns {SuccessResponse<{ onboarding_completed: true }>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Post('skip')
  @HttpCode(HttpStatus.OK)
  async skip(@Req() req) {
    const data = await this.onboardingService.skip(req.user.id);
    return successResponse(data);
  }
}
