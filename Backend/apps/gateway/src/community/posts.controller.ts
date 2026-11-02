import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { callService, COMMUNITY_SERVICE, CommunityPatterns } from '@app/common';
import type { PostView, ReactionResult, SaveResult } from '@app/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import {
  CreatePostDto,
  SetReactionDto,
  UpdatePostDto,
} from './dto/post.dto.js';
import { FeedEventsGateway } from './feed-events.gateway.js';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(
    @Inject(COMMUNITY_SERVICE) private readonly community: ClientProxy,
    private readonly events: FeedEventsGateway,
  ) {}

  @Post()
  async create(
    @Req() { userId }: AuthenticatedRequest,
    @Body() content: CreatePostDto,
  ) {
    const post = await callService<PostView>(
      this.community,
      CommunityPatterns.createPost,
      { userId, content },
    );
    this.events.announcePost({ id: post.id, authorId: userId });
    return post;
  }

  @Patch(':id')
  update(
    @Req() { userId }: AuthenticatedRequest,
    @Param('id') postId: string,
    @Body() changes: UpdatePostDto,
  ) {
    return callService<PostView>(this.community, CommunityPatterns.updatePost, {
      userId,
      postId,
      changes,
    });
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() { userId }: AuthenticatedRequest,
    @Param('id') postId: string,
  ) {
    await callService(this.community, CommunityPatterns.deletePost, {
      userId,
      postId,
    });
  }

  @Put(':id/reaction')
  setReaction(
    @Req() { userId }: AuthenticatedRequest,
    @Param('id') postId: string,
    @Body() { type }: SetReactionDto,
  ) {
    return callService<ReactionResult>(
      this.community,
      CommunityPatterns.setReaction,
      { userId, postId, type },
    );
  }

  @Delete(':id/reaction')
  removeReaction(
    @Req() { userId }: AuthenticatedRequest,
    @Param('id') postId: string,
  ) {
    return callService<ReactionResult>(
      this.community,
      CommunityPatterns.removeReaction,
      { userId, postId },
    );
  }

  @Post(':id/save')
  @HttpCode(200)
  save(@Req() { userId }: AuthenticatedRequest, @Param('id') postId: string) {
    return callService<SaveResult>(this.community, CommunityPatterns.savePost, {
      userId,
      postId,
    });
  }

  @Delete(':id/save')
  unsave(@Req() { userId }: AuthenticatedRequest, @Param('id') postId: string) {
    return callService<SaveResult>(
      this.community,
      CommunityPatterns.unsavePost,
      { userId, postId },
    );
  }
}
