import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { createApiResponse } from '../common/http-response';
import { ApiResponse } from '../interfaces';
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
  track(@Req() req: RequestWithSession, @Body() trackEventDto: TrackEventDto): ApiResponse<ITrackResponse> {
    this.trackingService.track(trackEventDto, req.session?.userId ? String(req.session.userId) : undefined);

    return createApiResponse(req, { ok: true });
  }
}
