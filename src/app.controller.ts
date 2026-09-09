import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { createApiResponse } from './common/http-response';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hello')
  getHello(@Req() request) {
    request.session.test = 'test 1024';

    return createApiResponse(request, 'HELLO WORLD');
  }
}
