// src/modules/events/dto/review-elevation.dto.ts

import { IsString, IsOptional } from 'class-validator';

export class RejectElevationDto {
  @IsString()
  @IsOptional()
  reviewNote?: string;
}
