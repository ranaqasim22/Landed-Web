import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { AuthSession } from '@app/common';
import * as argon2 from 'argon2';
import { Model, Types } from 'mongoose';
import { AuthMailService } from '../mail/auth-mail.service.js';
import { User, type UserDocument } from '../users/user.schema.js';
import { GoogleVerifierService } from './google-verifier.service.js';
import { OneTimeTokenService } from './one-time-token.service.js';
import { OneTimeTokenPurpose } from './schemas/one-time-token.schema.js';
import { SessionService } from './session.service.js';

const DUPLICATE_KEY_ERROR = 11000;
// Checked when the email is unknown, so response time doesn't reveal which emails have accounts.
const DUMMY_HASH = argon2.hash('landed-timing-placeholder');

function isDuplicateKeyError(error: unknown) {
  return (error as { code?: number }).code === DUPLICATE_KEY_ERROR;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly sessions: SessionService,
    private readonly oneTimeTokens: OneTimeTokenService,
    private readonly google: GoogleVerifierService,
    private readonly mail: AuthMailService,
  ) {}

  async signup(input: { fullName: string; email: string; password: string }) {
    const user = await this.users
      .create({
        fullName: input.fullName,
        email: input.email,
        passwordHash: await argon2.hash(input.password),
      })
      .catch((error: unknown) => {
        if (isDuplicateKeyError(error)) {
          throw new ConflictException(
            'An account with this email already exists',
          );
        }
        throw error;
      });
    await this.sendVerificationEmail(user);
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<AuthSession> {
    const user = await this.users.findOne({ email: input.email });
    const isPasswordCorrect = await argon2.verify(
      user?.passwordHash ?? (await DUMMY_HASH),
      input.password,
    );
    if (!user?.passwordHash || !isPasswordCorrect) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    // Checked after the password so that this can't be used to discover accounts.
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email first');
    }
    return this.sessions.start(user);
  }

  async loginWithGoogle(idToken: string): Promise<AuthSession> {
    const profile = await this.google.verify(idToken);
    const existing = await this.users.findOne({
      $or: [{ googleId: profile.googleId }, { email: profile.email }],
    });
    if (!existing) {
      const user = await this.users.create({
        ...profile,
        emailVerifiedAt: new Date(),
      });
      return { ...(await this.sessions.start(user)), isNewUser: true };
    }

    // Anyone can sign up with someone else's email and never verify it. Dropping that
    // password stops them from keeping access once the real owner arrives through Google.
    if (!existing.emailVerifiedAt) {
      existing.passwordHash = null;
      existing.emailVerifiedAt = new Date();
    }
    existing.googleId = profile.googleId;
    await existing.save();
    return { ...(await this.sessions.start(existing)), isNewUser: false };
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const { userId, familyId } = await this.sessions.rotate(refreshToken);
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException(
        'Your session has ended. Please log in again',
      );
    }
    return this.sessions.start(user, familyId);
  }

  logout(refreshToken: string) {
    return this.sessions.end(refreshToken);
  }

  async verifyEmail(token: string) {
    const userId = await this.oneTimeTokens.consume(
      token,
      OneTimeTokenPurpose.VerifyEmail,
    );
    if (!userId) {
      throw new BadRequestException(
        'This verification link is invalid or has expired',
      );
    }
    await this.users.updateOne(
      { _id: userId },
      { emailVerifiedAt: new Date() },
    );
  }

  async resendVerification(email: string) {
    const user = await this.users.findOne({ email });
    if (user && !user.emailVerifiedAt) await this.sendVerificationEmail(user);
  }

  async forgotPassword(email: string) {
    const user = await this.users.findOne({ email });
    if (!user) return;
    const token = await this.oneTimeTokens.create(
      user._id,
      OneTimeTokenPurpose.ResetPassword,
    );
    await this.mail.sendPasswordReset(user.email, token);
  }

  async resetPassword(input: { token: string; password: string }) {
    const userId = await this.oneTimeTokens.consume(
      input.token,
      OneTimeTokenPurpose.ResetPassword,
    );
    const user = userId && (await this.users.findById(userId));
    if (!user) {
      throw new BadRequestException(
        'This reset link is invalid or has expired',
      );
    }
    user.passwordHash = await argon2.hash(input.password);
    // Opening the emailed link proves the user owns the address.
    user.emailVerifiedAt ??= new Date();
    await user.save();
    await this.sessions.endAllForUser(user._id);
  }

  async deleteAccount(userId: string) {
    const id = new Types.ObjectId(userId);
    await this.sessions.endAllForUser(id);
    await this.oneTimeTokens.deleteForUser(id);
    await this.users.deleteOne({ _id: id });
  }

  private async sendVerificationEmail(user: UserDocument) {
    const token = await this.oneTimeTokens.create(
      user._id,
      OneTimeTokenPurpose.VerifyEmail,
    );
    await this.mail.sendEmailVerification(user.email, token);
  }
}
