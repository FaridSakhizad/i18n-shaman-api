import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { AppService } from './app.service';
import { createApiResponse } from './common/http-response';
import { ApiResponse } from './interfaces';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(@Req() request: Request): ApiResponse<{ status: string }> {
    return createApiResponse(request, this.appService.getHealth());
  }
}
