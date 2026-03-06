import { IsEmail, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  id: string;

  @IsEmail()
  email: string | null;

  oldPassword: string;

  @IsString()
  @MinLength(8)
  password: string;
}
