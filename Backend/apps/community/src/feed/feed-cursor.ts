import { BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

export interface FeedCursor {
  id: string;
  createdAt?: string;
  score?: number;
  // For You lists matching posts first, so it has to remember which list it was in.
  matching?: boolean;
}

export function encodeCursor(cursor: FeedCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(value: string): FeedCursor {
  try {
    const cursor = JSON.parse(
      Buffer.from(value, 'base64url').toString(),
    ) as FeedCursor;
    if (isValidObjectId(cursor.id)) return cursor;
  } catch {
    // A cursor that can't be read gets the same answer as one with a bad id.
  }
  throw new BadRequestException('This page link is no longer valid');
}
