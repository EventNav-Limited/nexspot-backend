import { IsString, IsUrl } from 'class-validator';

export class UpdateProfilePhotoDto {
  @IsString()
  @IsUrl()
  profilePhotoURL!: string;
}
