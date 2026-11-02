import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export const AVATAR_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type AvatarType = keyof typeof AVATAR_TYPES;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export class PresignUploadDto {
  @ApiProperty({ enum: Object.keys(AVATAR_TYPES) })
  @IsIn(Object.keys(AVATAR_TYPES), { message: 'Use a JPG, PNG or WebP image' })
  contentType: AvatarType;

  @ApiProperty({ description: 'File size in bytes', maximum: MAX_AVATAR_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_AVATAR_BYTES, { message: 'Use an image smaller than 5 MB' })
  size: number;
}
