// src/modules/users/dto/get-my-events.dto.ts

import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { EventStatus } from '../../generated/prisma/enums.js';
import { Type } from 'class-transformer';

export class GetMyEventsDto {
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  per_page?: number;
}
