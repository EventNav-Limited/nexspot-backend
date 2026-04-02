import { IsString, ValidateIf } from 'class-validator';

export class FindCategoryDto {
  @ValidateIf((o) => !o.id) // required if id is absent
  @IsString()
  slug?: string;

  @ValidateIf((o) => !o.slug) // required if slug is absent
  @IsString()
  id?: string;
}
