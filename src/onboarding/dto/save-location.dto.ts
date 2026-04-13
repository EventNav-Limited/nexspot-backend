// src/onboarding/dto/save-location.dto.ts

import { IsString, IsNumber, IsOptional } from 'class-validator';

export class SaveLocationDto {
  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
