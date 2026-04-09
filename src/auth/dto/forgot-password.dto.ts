import { PartialType, PickType } from '@nestjs/mapped-types';
import { RegisterDto } from './register.dto.js';

// TODO: fix this DTO
export class ForgotPasswordDto extends PartialType(
  PickType(RegisterDto, ['email', 'password'] as const),
) {}
