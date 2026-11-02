import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AVATAR_TYPES } from './dto/presign-upload.dto.js';
import type { PresignUploadDto } from './dto/presign-upload.dto.js';

const URL_LIFETIME_SECONDS = 5 * 60;

@Injectable()
export class UploadsService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.publicUrl = config.getOrThrow<string>('S3_PUBLIC_URL');
    this.client = new S3Client({
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION') ?? 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });
  }

  async presignAvatar(userId: string, { contentType, size }: PresignUploadDto) {
    const key = `avatars/${userId}/${randomUUID()}.${AVATAR_TYPES[contentType]}`;
    // Signing the size and type means storage rejects any other file, so the
    // limits can't be avoided by calling the upload URL directly.
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: size,
      }),
      {
        expiresIn: URL_LIFETIME_SECONDS,
        signableHeaders: new Set(['content-type', 'content-length']),
        unhoistableHeaders: new Set(['content-type', 'content-length']),
      },
    );
    return { uploadUrl, fileUrl: `${this.publicUrl}/${key}` };
  }

  isAvatarOwnedBy(url: string, userId: string) {
    return url.startsWith(`${this.publicUrl}/avatars/${userId}/`);
  }
}
