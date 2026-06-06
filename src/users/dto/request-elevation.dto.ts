// src/modules/events/dto/request-elevation.dto.ts

import { IsString, MinLength } from 'class-validator';

export class RequestElevationDto {
  @IsString()
  @MinLength(20, {
    message: 'Please provide a more detailed reason (min 20 characters)',
  })
  reason: string;
}
