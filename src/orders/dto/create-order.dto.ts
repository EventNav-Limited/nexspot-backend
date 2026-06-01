// src/events/dto/create-order.dto.ts

import { Type } from 'class-transformer';
import { IsUUID, IsInt, IsArray, Min, ValidateNested } from 'class-validator';

export class OrderItemDto {
  @IsUUID()
  ticketId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsUUID()
  eventId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
