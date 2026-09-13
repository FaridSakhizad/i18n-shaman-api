import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { VerifiedEmailGuard } from '../auth/verified-email.guard';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { SearchService } from './search.service';
import { createApiResponse } from '../common/http-response';
import { ApiResponse } from '../interfaces';
import { ISearchResponse } from './dto/project-api.dto';
import { withOperationLog } from '../common/logger';

@Controller()
export class SearchController {
  constructor(private readonly SearchService: SearchService) {}

  @Get('search')
  @UseGuards(AuthGuard, VerifiedEmailGuard)
  async getUserProjects(
    @Req() req,
    @Query('projectId') projectId: string,
    @Query('query') searchQuery: string,
    @Query('caseSensitive') caseSensitive: string,
    @Query('exact') exact: string,
    @Query('inKeys') inKeys: string,
    @Query('inValues') inValues: string,
    @Query('inFolders') inFolders: string,
    @Query('inComponents') inComponents: string,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<ISearchResponse>> {
    const result = await withOperationLog('search', {
      context: 'SearchController',
      projectId,
      userId,
      hasSearchQuery: Boolean(searchQuery),
      caseSensitive: caseSensitive === 'true',
      exact: exact === 'true',
      inKeys: inKeys !== 'false',
      inValues: inValues !== 'false',
      inFolders: inFolders !== 'false',
      inComponents: inComponents !== 'false',
    }, () => this.SearchService.performSearch({
      userId,
      projectId,
      searchQuery,
      caseSensitive: caseSensitive === 'true',
      exact: exact === 'true',
      inKeys: inKeys !== 'false',
      inValues: inValues !== 'false',
      inFolders: inFolders !== 'false',
      inComponents: inComponents !== 'false',
    }));

    return createApiResponse(req, result);
  }
}
