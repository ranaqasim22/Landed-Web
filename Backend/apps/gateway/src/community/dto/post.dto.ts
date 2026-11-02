import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FEED_TABS,
  POST_MAX_TAGS,
  POST_TEXT_MAX_LENGTH,
  REACTION_TYPES,
} from '@app/common';
import type { FeedTab, ReactionType } from '@app/common';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// "#APS", " aps " and "aps" are the same tag, and repeats count once towards the limit.
const normalizeTags = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.map((tag: unknown) =>
            typeof tag === 'string'
              ? tag.trim().replace(/^#+/, '').toLowerCase()
              : tag,
          ),
        ),
      ]
    : value;

const TAG_PATTERN = /^[a-z0-9-]{1,30}$/;
const TAG_RULE =
  'Tags can use letters, numbers and dashes, up to 30 characters';

export class CreatePostDto {
  @ApiProperty({ maxLength: POST_TEXT_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Write your question first' })
  @MaxLength(POST_TEXT_MAX_LENGTH, {
    message: `Keep your post to ${POST_TEXT_MAX_LENGTH} characters`,
  })
  text: string;

  @ApiPropertyOptional({ type: [String], maxItems: POST_MAX_TAGS })
  @IsOptional()
  @Transform(normalizeTags)
  @IsArray()
  @ArrayMaxSize(POST_MAX_TAGS, {
    message: `Add up to ${POST_MAX_TAGS} tags`,
  })
  @Matches(TAG_PATTERN, { each: true, message: TAG_RULE })
  tags: string[] = [];
}

export class UpdatePostDto {
  @ApiPropertyOptional({ maxLength: POST_TEXT_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Write your question first' })
  @MaxLength(POST_TEXT_MAX_LENGTH, {
    message: `Keep your post to ${POST_TEXT_MAX_LENGTH} characters`,
  })
  text?: string;

  @ApiPropertyOptional({ type: [String], maxItems: POST_MAX_TAGS })
  @IsOptional()
  @Transform(normalizeTags)
  @IsArray()
  @ArrayMaxSize(POST_MAX_TAGS, {
    message: `Add up to ${POST_MAX_TAGS} tags`,
  })
  @Matches(TAG_PATTERN, { each: true, message: TAG_RULE })
  tags?: string[];
}

export class SetReactionDto {
  @ApiProperty({ enum: REACTION_TYPES })
  @IsIn(REACTION_TYPES, { message: 'Choose one of the reactions' })
  type: ReactionType;
}

export class FeedQueryDto {
  @ApiPropertyOptional({ enum: FEED_TABS })
  @IsOptional()
  @IsIn(FEED_TABS)
  tab: FeedTab = 'for_you';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
