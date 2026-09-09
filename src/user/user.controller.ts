import { Controller, UseGuards, Post, Body, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { SetLanguageDto, SetPreferencesDto } from './dto/setLanguage.dto';
import { createApiResponse } from '../common/http-response';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('setLanguage')
  async setLanguage(@Req() req, @Body() setLanguageDto: SetLanguageDto, @CurrentUserId() userId: string) {
    const { language } = setLanguageDto;
    const result = await this.userService.setLanguage(userId, language);

    return createApiResponse(req, result);
  }

  @Post('savePreferences')
  async savePreferences(@Req() req, @Body() setPreferencesDto: SetPreferencesDto, @CurrentUserId() userId: string) {
    const { data } = setPreferencesDto;
    const result = await this.userService.savePreferences(userId, data);

    return createApiResponse(req, result);
  }
}
