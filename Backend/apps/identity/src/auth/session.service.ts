import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import type { AccessTokenPayload, AuthSession } from '@app/common';
import { Model, Types } from 'mongoose';
import { toPublicUser } from '../users/to-public-user.js';
import type { UserDocument } from '../users/user.schema.js';
import { RefreshToken } from './schemas/refresh-token.schema.js';
import { generateToken, hashToken } from './secure-token.js';

const REFRESH_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
// Two open tabs can refresh at the same moment with the same cookie. That is normal
// use, so only a replay after this window is treated as a stolen token.
const REUSE_GRACE_MS = 10 * 1000;

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokens: Model<RefreshToken>,
    private readonly jwt: JwtService,
  ) {}

  async start(
    user: UserDocument,
    familyId: string = randomUUID(),
  ): Promise<AuthSession> {
    const refreshToken = generateToken();
    const expiresAt = new Date(Date.now() + REFRESH_LIFETIME_MS);
    await this.refreshTokens.create({
      userId: user._id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });
    const payload: AccessTokenPayload = { sub: user.id };
    return {
      user: toPublicUser(user),
      accessToken: await this.jwt.signAsync(payload),
      refreshToken,
      refreshExpiresAt: expiresAt.toISOString(),
    };
  }

  // Marks the token as used in one atomic step, so it can only ever be rotated once.
  async rotate(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const current = await this.refreshTokens.findOneAndUpdate(
      { tokenHash, rotatedAt: null, expiresAt: { $gt: new Date() } },
      { rotatedAt: new Date() },
    );
    if (current) return current;

    const used = await this.refreshTokens.findOne({ tokenHash });
    const isReplay =
      used?.rotatedAt && Date.now() - used.rotatedAt.getTime() > REUSE_GRACE_MS;
    if (isReplay) {
      await this.refreshTokens.deleteMany({ familyId: used.familyId });
    }
    throw new UnauthorizedException(
      'Your session has ended. Please log in again',
    );
  }

  async end(refreshToken: string) {
    const token = await this.refreshTokens.findOne({
      tokenHash: hashToken(refreshToken),
    });
    if (token) {
      await this.refreshTokens.deleteMany({ familyId: token.familyId });
    }
  }

  async endAllForUser(userId: Types.ObjectId) {
    await this.refreshTokens.deleteMany({ userId });
  }
}
