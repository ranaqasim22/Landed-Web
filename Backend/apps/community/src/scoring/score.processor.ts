import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ScoreService } from './score.service.js';

export const SCORE_QUEUE = 'post-scores';
const EVERY_15_MINUTES = 15 * 60 * 1000;

@Processor(SCORE_QUEUE)
export class ScoreProcessor extends WorkerHost implements OnModuleInit {
  constructor(
    private readonly scores: ScoreService,
    @InjectQueue(SCORE_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  // Using a fixed id means restarting or running several copies never adds a second schedule.
  onModuleInit() {
    return this.queue.upsertJobScheduler('recalculate-scores', {
      every: EVERY_15_MINUTES,
    });
  }

  process() {
    return this.scores.recalculate();
  }
}
