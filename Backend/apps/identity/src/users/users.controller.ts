import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { IdentityPatterns } from '@app/common';
import type { UpdateProfileInput } from '@app/common';
import { UsersService } from './users.service.js';

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @MessagePattern(IdentityPatterns.getMe)
  getMe(@Payload() input: { userId: string }) {
    return this.users.getMe(input.userId);
  }

  @MessagePattern(IdentityPatterns.getUserCards)
  getCards(@Payload() input: { userIds: string[] }) {
    return this.users.getCards(input.userIds);
  }

  @MessagePattern(IdentityPatterns.updateMe)
  updateMe(@Payload() input: { userId: string; changes: UpdateProfileInput }) {
    return this.users.updateMe(input.userId, input.changes);
  }
}
