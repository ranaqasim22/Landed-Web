import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module.js';
import { SCORE_QUEUE, ScoreProcessor } from './score.processor.js';
import { ScoreService } from './score.service.js';

@Module({
  imports: [PostsModule, BullModule.registerQueue({ name: SCORE_QUEUE })],
  providers: [ScoreService, ScoreProcessor],
  exports: [ScoreService],
})
export class ScoringModule {}
