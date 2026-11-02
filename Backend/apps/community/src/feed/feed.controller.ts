import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CommunityPatterns } from '@app/common';
import type { GetFeedInput } from '@app/common';
import { FeedService } from './feed.service.js';
import { TagsService } from './tags.service.js';

@Controller()
export class FeedController {
  constructor(
    private readonly feed: FeedService,
    private readonly tags: TagsService,
  ) {}

  @MessagePattern(CommunityPatterns.getFeed)
  getFeed(@Payload() input: GetFeedInput) {
    return this.feed.getFeed(input);
  }

  @MessagePattern(CommunityPatterns.trendingTags)
  trendingTags() {
    return this.tags.getTrending();
  }
}
