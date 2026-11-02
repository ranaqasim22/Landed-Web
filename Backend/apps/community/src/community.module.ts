import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import {
  createLoggerModule,
  IDENTITY_SERVICE,
  redisTransport,
} from '@app/common';
import { FeedModule } from './feed/feed.module.js';
import { HealthController } from './health.controller.js';
import { PostsModule } from './posts/posts.module.js';
import { ScoringModule } from './scoring/scoring.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    createLoggerModule(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('COMMUNITY_MONGODB_URI'),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: Number(config.getOrThrow<string>('REDIS_PORT')),
        },
      }),
    }),
    ClientsModule.registerAsync({
      isGlobal: true,
      clients: [
        {
          name: IDENTITY_SERVICE,
          inject: [ConfigService],
          useFactory: redisTransport,
        },
      ],
    }),
    PostsModule,
    FeedModule,
    ScoringModule,
  ],
  controllers: [HealthController],
})
export class CommunityModule {}
