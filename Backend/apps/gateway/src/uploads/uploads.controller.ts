import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { PresignUploadDto } from './dto/presign-upload.dto.js';
import { UploadsService } from './uploads.service.js';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('presign')
  presign(
    @Req() request: AuthenticatedRequest,
    @Body() body: PresignUploadDto,
  ) {
    return this.uploads.presignAvatar(request.userId, body);
  }
}
