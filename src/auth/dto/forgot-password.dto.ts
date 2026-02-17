import { PickType } from '@nestjs/mapped-types';
import { RegisterDto } from './register.dto.js';

export class ForgotPasswordDto extends PickType(RegisterDto, [
  'email',
  'password',
] as const) {}
