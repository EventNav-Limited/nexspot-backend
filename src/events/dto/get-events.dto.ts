// src/events/dto/get-events.dto.ts

import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PriceFilter {
  FREE = 'free',
  PAID = 'paid',
}

export enum DatePreset {
  TODAY = 'today',
  TOMORROW = 'tomorrow',
  THIS_WEEK = 'this_week',
  THIS_WEEKEND = 'this_weekend',
}

export enum SortOrder {
  RELEVANCE = 'relevance',
  DATE = 'date',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
}

export class GetEventsDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(PriceFilter)
  @IsOptional()
  price?: PriceFilter;

  @IsEnum(DatePreset)
  @IsOptional()
  date?: DatePreset;

  @IsDateString()
  @IsOptional()
  date_from?: string;

  @IsDateString()
  @IsOptional()
  date_to?: string;

  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsUUID()
  @IsOptional()
  format_id?: string;

  @IsEnum(SortOrder)
  @IsOptional()
  sort?: SortOrder;

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
