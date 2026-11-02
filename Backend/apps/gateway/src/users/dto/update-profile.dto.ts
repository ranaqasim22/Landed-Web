import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  APPLICATION_STAGES,
  INTAKE_SEASONS,
  TARGET_DEGREES,
} from '@app/common';
import type { ApplicationStage, IntakeSeason, TargetDegree } from '@app/common';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

class IntakeDto {
  @ApiPropertyOptional({ enum: INTAKE_SEASONS })
  @IsIn(INTAKE_SEASONS, { message: 'Choose winter or summer semester' })
  season: IntakeSeason;

  @ApiPropertyOptional({ example: 2027 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ana Silva', maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter your name' })
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'Pakistan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ enum: TARGET_DEGREES })
  @IsOptional()
  @IsIn(TARGET_DEGREES)
  targetDegree?: TargetDegree;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  fieldOfStudy?: string;

  @ApiPropertyOptional({ type: IntakeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntakeDto)
  intake?: IntakeDto;

  @ApiPropertyOptional({ enum: APPLICATION_STAGES })
  @IsOptional()
  @IsIn(APPLICATION_STAGES)
  stage?: ApplicationStage;

  @ApiPropertyOptional({ example: 'Karachi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  embassy?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Null removes it' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160, { message: 'Keep your bio to 160 characters' })
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onboardingSkipped?: boolean;
}
