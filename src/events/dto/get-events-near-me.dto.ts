// src/modules/events/dto/get-events-near-me.dto.ts

import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetEventsNearMeDto {
  @IsLatitude()
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsLongitude()
  @IsOptional()
  @Type(() => Number)
  lng?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  radius?: number; // in km, default 10, max 100

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
