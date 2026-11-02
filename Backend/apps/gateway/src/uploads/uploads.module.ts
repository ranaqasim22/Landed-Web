import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';

// Signing a URL needs no database, so this lives in the gateway rather than in its own service.
@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
