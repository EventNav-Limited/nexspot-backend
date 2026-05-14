// src/events/dto/update-ticket.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketDto } from './create-ticket.dto.js';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {}
