import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [AuthModule, UploadsModule],
  controllers: [UsersController],
})
export class UsersModule {}
