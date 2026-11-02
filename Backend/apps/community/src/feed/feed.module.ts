import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { PostsModule } from '../posts/posts.module.js';
import { FeedController } from './feed.controller.js';
import { FeedService } from './feed.service.js';
import { REDIS_CLIENT, TagsService } from './tags.service.js';

@Module({
  imports: [PostsModule],
  controllers: [FeedController],
  providers: [
    FeedService,
    TagsService,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: Number(config.getOrThrow<string>('REDIS_PORT')),
        }),
    },
  ],
  exports: [TagsService],
})
export class FeedModule {}
