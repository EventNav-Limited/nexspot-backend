// src/events/dto/create-ticket.dto.ts

import { IsString, IsNumber, IsInt, Min } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
