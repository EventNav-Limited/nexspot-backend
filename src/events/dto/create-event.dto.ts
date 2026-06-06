// src/events/dto/create-event.dto.ts

import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  IsUrl,
  Min,
  ValidateIf,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { EventFormat } from '../../generated/prisma/client.js';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsEnum(EventFormat)
  deliveryMode: EventFormat;

  @IsString()
  categoryId: string;

  @IsString()
  formatId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsUrl()
  @IsOptional()
  bannerURL?: string;

  // required only for in-person and hybrid events
  @ValidateIf((o) => o.format !== EventFormat.ONLINE)
  @IsString()
  location?: string;

  @ValidateIf((o) => o.format !== EventFormat.ONLINE)
  @IsLatitude()
  latitude?: number;

  @ValidateIf((o) => o.format !== EventFormat.ONLINE)
  @IsLongitude()
  longitude?: number;

  // required only for online and hybrid events
  @ValidateIf((o) => o.deliveryMode === !EventFormat.IN_PERSON)
  @IsUrl()
  onlineLink?: string;
}
