import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { createApiResponse } from '../common/http-response';
import { ApiResponse } from '../common/api-response.interface';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';
import { TrackEventDto } from './dto/track-event.dto';
import { TrackingService } from './tracking.service';

type RequestWithSession = Request & {
  session?: {
    userId?: unknown;
  };
};

interface ITrackResponse {
  ok: true;
}

@Controller('track')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post()
  @RateLimit({ max: 120, windowMs: 60 * 1000, keyPrefix: 'tracking:track' })
  @UseGuards(RateLimitGuard)
  track(@Req() req: RequestWithSession, @Body() trackEventDto: TrackEventDto): ApiResponse<ITrackResponse> {
    this.trackingService.track(trackEventDto, req.session?.userId ? String(req.session.userId) : undefined);

    return createApiResponse(req, { ok: true });
  }
}
