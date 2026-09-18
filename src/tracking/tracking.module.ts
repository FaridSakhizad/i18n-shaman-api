import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { RateLimitGuard } from '../common/rate-limit.guard';

@Module({
  controllers: [TrackingController],
  providers: [TrackingService, RateLimitGuard],
})
export class TrackingModule {}
