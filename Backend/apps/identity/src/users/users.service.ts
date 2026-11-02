import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { PublicUser, UpdateProfileInput, UserCard } from '@app/common';
import { Model } from 'mongoose';
import { toPublicUser } from './to-public-user.js';
import { User, type UserDocument } from './user.schema.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  async getMe(userId: string): Promise<PublicUser> {
    return toPublicUser(await this.findOrThrow(userId));
  }

  async updateMe(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<PublicUser> {
    const user = await this.findOrThrow(userId);
    user.set(input);
    // Degree and intake are the only answers the feed can't work without.
    if (input.onboardingCompleted && (!user.targetDegree || !user.intake)) {
      throw new BadRequestException(
        'Choose your degree and intake to finish setting up your profile',
      );
    }
    await user.save();
    return toPublicUser(user);
  }

  async getCards(userIds: string[]): Promise<UserCard[]> {
    const users = await this.users.find({ _id: { $in: userIds } });
    return users.map((user) => {
      const { id, fullName, avatarUrl, intake, embassy } = toPublicUser(user);
      return { id, fullName, avatarUrl, intake, embassy };
    });
  }

  private async findOrThrow(userId: string): Promise<UserDocument> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('We could not find your account');
    return user;
  }
}
