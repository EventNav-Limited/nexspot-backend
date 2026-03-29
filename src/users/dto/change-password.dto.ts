import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  oldPassword: string;

  @IsString()
  @MinLength(8)
  password: string;
}
