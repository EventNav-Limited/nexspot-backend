// src/onboarding/dto/save-interests.dto.ts

import { IsArray, IsString } from 'class-validator';

export class SaveInterestsDto {
  @IsArray()
  @IsString({ each: true })
  interest_ids: string[];
}
