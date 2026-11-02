import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { callService, IDENTITY_SERVICE, IdentityPatterns } from '@app/common';
import type { PublicUser } from '@app/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(
    @Inject(IDENTITY_SERVICE) private readonly identity: ClientProxy,
    private readonly uploads: UploadsService,
  ) {}

  @Get()
  getMe(@Req() request: AuthenticatedRequest) {
    return callService<PublicUser>(this.identity, IdentityPatterns.getMe, {
      userId: request.userId,
    });
  }

  @Patch()
  updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() changes: UpdateProfileDto,
  ) {
    // An avatar must be a file this user uploaded, not any address on the internet.
    if (
      changes.avatarUrl &&
      !this.uploads.isAvatarOwnedBy(changes.avatarUrl, request.userId)
    ) {
      throw new BadRequestException('Please upload your photo again');
    }
    return callService<PublicUser>(this.identity, IdentityPatterns.updateMe, {
      userId: request.userId,
      changes,
    });
  }
}
