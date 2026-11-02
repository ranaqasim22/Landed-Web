import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { callService, COMMUNITY_SERVICE, CommunityPatterns } from '@app/common';
import type { FeedPage, TrendingTag } from '@app/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { FeedQueryDto } from './dto/post.dto.js';

@ApiTags('feed')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class FeedController {
  constructor(
    @Inject(COMMUNITY_SERVICE) private readonly community: ClientProxy,
  ) {}

  @Get('feed')
  getFeed(
    @Req() { userId }: AuthenticatedRequest,
    @Query() { tab, cursor, limit }: FeedQueryDto,
  ) {
    return callService<FeedPage>(this.community, CommunityPatterns.getFeed, {
      userId,
      tab,
      cursor,
      limit,
    });
  }

  @Get('tags/trending')
  trendingTags() {
    return callService<TrendingTag[]>(
      this.community,
      CommunityPatterns.trendingTags,
      {},
    );
  }
}
