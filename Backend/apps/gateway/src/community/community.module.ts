import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FeedEventsGateway } from './feed-events.gateway.js';
import { FeedController } from './feed.controller.js';
import { PostsController } from './posts.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [FeedController, PostsController],
  providers: [FeedEventsGateway],
})
export class CommunityModule {}
