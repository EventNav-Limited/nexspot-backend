import { PickType } from '@nestjs/mapped-types';
import { RegisterDto } from './register.dto.js';

// TODO: fix this DTO
export class ForgotPasswordDto extends PickType(RegisterDto, [
  'email',
] as const) {}
