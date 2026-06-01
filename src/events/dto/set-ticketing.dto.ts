// src/modules/events/dto/set-ticketing.dto.ts

import {
  IsEnum,
  IsArray,
  IsString,
  IsNumber,
  IsInt,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TicketType {
  FREE = 'free',
  PAID = 'paid',
}

export class TicketTierDto {
  @IsString()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsString()
  currency: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class SetTicketingDto {
  @IsEnum(TicketType)
  type: TicketType;

  @ValidateIf((o) => o.type === TicketType.PAID)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTierDto)
  tiers?: TicketTierDto[];
}
