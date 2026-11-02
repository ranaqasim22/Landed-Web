import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  OneTimeToken,
  OneTimeTokenPurpose,
} from './schemas/one-time-token.schema.js';
import { generateToken, hashToken } from './secure-token.js';

const LIFETIME_MS: Record<OneTimeTokenPurpose, number> = {
  [OneTimeTokenPurpose.VerifyEmail]: 24 * 60 * 60 * 1000,
  [OneTimeTokenPurpose.ResetPassword]: 60 * 60 * 1000,
};

@Injectable()
export class OneTimeTokenService {
  constructor(
    @InjectModel(OneTimeToken.name)
    private readonly tokens: Model<OneTimeToken>,
  ) {}

  // Only the newest link of each kind works, so an old email can't be used later.
  async create(userId: Types.ObjectId, purpose: OneTimeTokenPurpose) {
    await this.tokens.deleteMany({ userId, purpose });
    const token = generateToken();
    await this.tokens.create({
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + LIFETIME_MS[purpose]),
    });
    return token;
  }

  async consume(token: string, purpose: OneTimeTokenPurpose) {
    const record = await this.tokens.findOneAndDelete({
      tokenHash: hashToken(token),
      purpose,
      expiresAt: { $gt: new Date() },
    });
    return record?.userId ?? null;
  }

  async deleteForUser(userId: Types.ObjectId) {
    await this.tokens.deleteMany({ userId });
  }
}
