import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { SearchService } from './search.service';
import { createApiResponse } from '../common/http-response';

@Controller()
export class SearchController {
  constructor(private readonly SearchService: SearchService) {}

  @Get('search')
  @UseGuards(AuthGuard)
  async getUserProjects(
    @Req() req,
    @Query('projectId') projectId: string,
    @Query('query') searchQuery: string,
    @Query('case_sensitive') caseSensitive: string,
    @Query('exact') exact: string,
    @Query('in_keys') inKeys: string,
    @Query('in_values') inValues: string,
    @Query('in_folders') inFolders: string,
    @Query('in_components') inComponents: string,
    @CurrentUserId() userId: string,
  ) {
    const result = await this.SearchService.performSearch({
      userId,
      projectId,
      searchQuery,
      caseSensitive: caseSensitive === 'true',
      exact: exact === 'true',
      inKeys: inKeys !== 'false',
      inValues: inValues !== 'false',
      inFolders: inFolders !== 'false',
      inComponents: inComponents !== 'false',
    });

    return createApiResponse(req, result);
  }
}
