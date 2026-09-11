import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Delete,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user-id.decorator';

import { Service } from './service';
import { EExportFormats, IEditTag, ILanguage, IProject, IProjectData } from './interfaces/project.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddLanguageDto } from './dto/add-language.dto';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateKeyDto } from './dto/update-key.dto';
import { LanguageVisibilityDto } from './dto/language-visibility.dto';
import { AddMultipleLanguagesDto } from './dto/add-multiple-languages.dto';
import { MultipleLanguageVisibilityDto } from './dto/multiple-languages-visibility.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { IKey } from './interfaces/key.interface';
import { GetProjectByIdDto, TSortBy, TSortDirection } from './dto/get-project-by-id.dto';
import { DeleteProjectEntitiesDto } from './dto/delete-entities.dto';
import { GetEntitiesChildrenByIdsDto } from './dto/get-entities-children-by-ids.dto';
import { MoveProjectEntities } from './dto/MoveProjectEntities.dto';
import { AddTagsToEntityDto, CreateTagDto, DeleteTagDto, EditTagDto } from './dto/tags.dto';
import { AssignTagToEntitiesDto } from './dto/tags.dto';
import { createApiResponse } from '../common/http-response';
import { ApiResponse } from '../interfaces';
import {
  AddRawLanguagesDto,
  DeleteProjectDto,
  DeleteProjectLanguageDto,
  ExportProjectQueryDto,
  IEntityContentResponse,
  IEntityMutationResponse,
  IEntitiesResponse,
  IImportComponentsMetaDataItem,
  IImportResult,
  IKeyDataResponse,
  IKeyMutationResponse,
  IOkResponse,
  ITagListResponse,
  UpdateProjectDto,
} from './dto/project-api.dto';
import { withOperationLog } from '../common/logger';

@Controller()
export class TransController {
  constructor(private readonly Service: Service) {}

  @Post('createProject')
  @UseGuards(AuthGuard)
  async createProject(@Req() req, @Body() createProjectDto: CreateProjectDto, @CurrentUserId() userId: string): Promise<ApiResponse<IProject[]>> {
    const result = await this.Service.createProject(createProjectDto, userId);

    return createApiResponse(req, result);
  }

  @Post('updateProject')
  @UseGuards(AuthGuard)
  async updateProject(@Req() req, @Body() projectData: UpdateProjectDto, @CurrentUserId() userId: string): Promise<ApiResponse<IProject>> {
    const result = await this.Service.updateProject(projectData, userId);

    return createApiResponse(req, result);
  }

  @Delete('deleteProject')
  @UseGuards(AuthGuard)
  async deleteProject(
    @Req() req,
    @Body() deleteProjectDto: DeleteProjectDto,
    @Query('projectId') projectIdFromQuery: string,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IProject[]>> {
    const result = await this.Service.deleteProject(deleteProjectDto?.projectId || projectIdFromQuery, userId);

    return createApiResponse(req, result);
  }

  @Get('getUserProjects')
  @UseGuards(AuthGuard)
  async getUserProjects(@Req() req, @CurrentUserId() userId: string): Promise<ApiResponse<IProject[]>> {
    const result = await this.Service.getUserProjects(userId);

    return createApiResponse(req, result);
  }

  @Get('getUserProjectById')
  @UseGuards(AuthGuard)
  async getUserProjectById(
    @Query('projectId') projectId: string,
    @Query('subFolderId') subFolderId: string,
    @Query('page') page: string,
    @Query('itemsPerPage') itemsPerPage: string,
    @Query('sortBy') sortBy: TSortBy,
    @Query('sortDirection') sortDirection: TSortDirection,
    @Query('filters') filters: string,
    @Query('tags') tags: string,
    @Query('search') searchQuery: string,
    @Query('searchParams') searchParams: string,
    @Req() req,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IProjectData>> {
    const result = await withOperationLog('project_load', {
      context: 'TransController',
      projectId,
      userId,
      page: parseInt(page, 10),
      itemsPerPage: parseInt(itemsPerPage, 10),
      hasSearchQuery: Boolean(searchQuery),
      filtersCount: filters ? filters.split(',').filter(Boolean).length : 0,
      tagsCount: tags ? tags.split(',').filter(Boolean).length : 0,
    }, () => this.Service.getUserProjectById({
      projectId,
      page: parseInt(page, 10),
      itemsPerPage: parseInt(itemsPerPage, 10),
      subFolderId,
      sortBy,
      sortDirection,
      filters: filters ? filters.split(',') : [],
      tags: tags ? tags.split(',') : [],
      searchQuery,
      searchParams: searchQuery && searchParams ? searchParams.split(',') : [],
    } as GetProjectByIdDto, userId));

    return createApiResponse(req, result);
  }

  @Get('getKeyData')
  @UseGuards(AuthGuard)
  async getKeyData(
    @Req() req,
    @Query('projectId') projectId: string,
    @Query('keyId') keyId: string,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IKeyDataResponse>> {
    const result = await this.Service.getKeyData(projectId, userId, keyId);

    return createApiResponse(req, result);
  }

  @Get('getEntityContent')
  @UseGuards(AuthGuard)
  async getEntityContent(
    @Req() req,
    @Query('projectId') projectId: string,
    @Query('componentId') componentId: string,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IEntityContentResponse>> {
    const result = await this.Service.getEntityContent(projectId, userId, componentId);

    return createApiResponse(req, result);
  }

  @Post('getEntitiesChildrenByIds')
  @UseGuards(AuthGuard)
  async getEntitiesChildrenByIds(
    @Req() req,
    @Body() getEntitiesChildrenByIdsDto: GetEntitiesChildrenByIdsDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IKey[]>> {
    const { projectId, ids } = getEntitiesChildrenByIdsDto;
    const result = await this.Service.getEntitiesChildrenByIds(projectId, userId, ids);

    return createApiResponse(req, result);
  }

  @Post('createProjectEntity')
  @UseGuards(AuthGuard)
  async createProjectEntity(@Req() req, @Body() createKeyEntity: CreateEntityDto, @CurrentUserId() userId: string): Promise<ApiResponse<unknown>> {
    const result = await this.Service.createProjectEntity(createKeyEntity, userId);

    return createApiResponse(req, result);
  }

  @Delete('deleteProjectEntities')
  @UseGuards(AuthGuard)
  async deleteProjectEntities(@Req() req, @Body() body: DeleteProjectEntitiesDto, @CurrentUserId() userId: string): Promise<ApiResponse<IEntityMutationResponse>> {
    const { projectId, entityIds } = body;
    const result = await this.Service.deleteProjectEntities(userId, projectId, entityIds);

    return createApiResponse(req, result);
  }

  @Post('duplicateEntities')
  @UseGuards(AuthGuard)
  async duplicateEntities(@Req() req, @Body() body: DeleteProjectEntitiesDto, @CurrentUserId() userId: string): Promise<ApiResponse<IEntityMutationResponse>> {
    const { projectId, entityIds } = body;
    const result = await this.Service.duplicateEntities(userId, projectId, entityIds);

    return createApiResponse(req, result);
  }

  @Post('moveEntities')
  @UseGuards(AuthGuard)
  async moveEntities(@Req() req, @Body() body: MoveProjectEntities, @CurrentUserId() userId: string): Promise<ApiResponse<IEntityMutationResponse>> {
    const { projectId, entityIds, destinationEntityId } = body;
    const result = await this.Service.moveEntities(userId, projectId, entityIds, destinationEntityId);

    return createApiResponse(req, result);
  }

  @Post('updateKey')
  @UseGuards(AuthGuard)
  async updateKey(@Req() req, @Body() updateKeyDto: UpdateKeyDto, @CurrentUserId() userId: string): Promise<ApiResponse<IKeyMutationResponse>> {
    const result = await this.Service.updateProjectEntity(updateKeyDto, userId);

    return createApiResponse(req, result);
  }

  @Post('addLanguage')
  @UseGuards(AuthGuard)
  async addLanguage(@Req() req, @Body() addLanguageDto: AddLanguageDto, @CurrentUserId() userId: string): Promise<ApiResponse<unknown>> {
    const result = await this.Service.addLanguage(addLanguageDto, userId);

    return createApiResponse(req, result);
  }

  @Post('updateLanguage')
  @UseGuards(AuthGuard)
  async updateLanguage(@Req() req, @Body() updateLanguageDto: UpdateLanguageDto, @CurrentUserId() userId: string): Promise<ApiResponse<IProject>> {
    const result = await this.Service.updateLanguage(updateLanguageDto, userId);

    return createApiResponse(req, result);
  }

  @Post('addMultipleLanguages')
  @UseGuards(AuthGuard)
  async addMultipleProjectLanguages(
    @Req() req,
    @Body() addMultipleLanguagesDto: AddMultipleLanguagesDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IProject>> {
    const result = await this.Service.addMultipleProjectLanguages(addMultipleLanguagesDto, userId);

    return createApiResponse(req, result);
  }

  @Post('createTag')
  @UseGuards(AuthGuard)
  async createTag(
    @Req() req,
    @Body() createTagDto: CreateTagDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<ITagListResponse>> {
    const result = await this.Service.createTag(createTagDto, userId);

    return createApiResponse(req, result);
  }

  @Post('addTagsToEntities')
  @UseGuards(AuthGuard)
  async addTagsToEntities(
    @Req() req,
    @Body() addTagsToEntityDto: AddTagsToEntityDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<ITagListResponse>> {
    const result = await this.Service.addTagsToEntities(addTagsToEntityDto, userId);

    return createApiResponse(req, result);
  }

  @Post('assignTagToEntities')
  @UseGuards(AuthGuard)
  async assignTagToEntities(
    @Req() req,
    @Body() assignTagToEntitiesDto: AssignTagToEntitiesDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IEntitiesResponse>> {
    const result = await this.Service.assignTagToEntities(assignTagToEntitiesDto, userId);

    return createApiResponse(req, result);
  }

  @Post('updateTag')
  @UseGuards(AuthGuard)
  async updateTag(
    @Req() req,
    @Body() editTagDto: EditTagDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IOkResponse>> {
    const result = await this.Service.updateTag(editTagDto as IEditTag, userId);

    return createApiResponse(req, result);
  }

  @Post('deleteTag')
  @UseGuards(AuthGuard)
  async deleteTag(
    @Req() req,
    @Body() deleteTagDto: DeleteTagDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<ITagListResponse>> {
    const result = await this.Service.deleteTag(deleteTagDto, userId);

    return createApiResponse(req, result);
  }

  @Post('detachTagFromEntities')
  @UseGuards(AuthGuard)
  async detachTagFromEntities(
    @Req() req,
    @Body() assignTagToEntitiesDto: AssignTagToEntitiesDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IEntitiesResponse>> {
    const result = await this.Service.detachTagFromEntities(assignTagToEntitiesDto, userId);

    return createApiResponse(req, result);
  }

  @Delete('deleteLanguage')
  @UseGuards(AuthGuard)
  async deleteProjectLanguage(
    @Req() req,
    @Body() deleteProjectLanguageDto: DeleteProjectLanguageDto,
    @Query('languageId') languageIdFromQuery: string,
    @Query('projectId') projectIdFromQuery: string,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IProject>> {
    const languageId = deleteProjectLanguageDto?.languageId || languageIdFromQuery;
    const projectId = deleteProjectLanguageDto?.projectId || projectIdFromQuery;
    const result = await this.Service.deleteProjectLanguage(projectId, languageId, userId);

    return createApiResponse(req, result);
  }

  @Post('setLanguageVisibility')
  @UseGuards(AuthGuard)
  async setLanguageVisibility(@Req() req, @Body() languageVisibilityDto: LanguageVisibilityDto, @CurrentUserId() userId: string): Promise<ApiResponse<IProject>> {
    const result = await this.Service.setLanguageVisibility(languageVisibilityDto, userId);

    return createApiResponse(req, result);
  }

  @Post('setMultipleLanguagesVisibility')
  @UseGuards(AuthGuard)
  async setMultipleLanguagesVisibility(
    @Req() req,
    @Body() multipleLanguageVisibilityDto: MultipleLanguageVisibilityDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IProject>> {
    const result = await this.Service.setMultipleLanguagesVisibility(multipleLanguageVisibilityDto, userId);

    return createApiResponse(req, result);
  }

  @Get('exportProject')
  @UseGuards(AuthGuard)
  async exportProject(
    @Query() exportProjectQueryDto: ExportProjectQueryDto,
    @CurrentUserId() userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const {
      projectId,
      format,
      formatSettings = {},
    } = exportProjectQueryDto;

    if (format === EExportFormats.json) {
      await withOperationLog('export', {
        context: 'TransController',
        projectId,
        userId,
        format,
      }, () => this.Service.exportProjectToJson(projectId, formatSettings, userId, res));
      return;
    }

    if (format === EExportFormats.androidXml) {
      await withOperationLog('export', {
        context: 'TransController',
        projectId,
        userId,
        format,
      }, () => this.Service.exportProjectToAndroidXml(projectId, formatSettings, userId, res));
      return;
    }

    if (format === EExportFormats.appleStrings) {
      await withOperationLog('export', {
        context: 'TransController',
        projectId,
        userId,
        format,
      }, () => this.Service.exportProjectToAppleStrings(projectId, formatSettings, userId, res));
      return;
    }

    throw new BadRequestException({
      error: 'Export Failed',
      message: 'Format is not supported',
    });
  }

  @Post('importJsonDataToProject')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  async importJsonDataToProject(
    @Req() req,
    @Body('projectId') projectId: string,
    @Body('metaData') metaData: string,
    @CurrentUserId() userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ApiResponse<IImportResult>> {
    const result = await withOperationLog('import_json', {
      context: 'TransController',
      projectId,
      userId,
      fileCount: files?.length || 0,
    }, () => this.Service.importDataToProject({ projectId, files, metaData }, userId));

    return createApiResponse(req, result);
  }

  @Post('importComponentsDataToProject')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  async importComponentsDataToProject(
    @Req() req,
    @Body('projectId') projectId: string,
    @Body('metaData') metaData: string[] | string,
    @CurrentUserId() userId: string,
    @UploadedFiles() files: Express.Multer.File[] & { code: string },
  ): Promise<ApiResponse<IImportResult>> {
    let metaDataParsed: IImportComponentsMetaDataItem[];

    try {
      metaDataParsed = typeof metaData === 'string'
        ? [JSON.parse(metaData as string)]
        : metaData.map((dataItem) => JSON.parse(dataItem));
    } catch {
      throw new BadRequestException({
        error: 'Import Failed',
        message: 'Import metadata is invalid',
      });
    }

    const result = await withOperationLog('import_components', {
      context: 'TransController',
      projectId,
      userId,
      fileCount: files?.length || 0,
      metadataCount: metaDataParsed.length,
    }, () => this.Service.importComponentsDataToProject({
      projectId,
      files,
      metaData: metaDataParsed,
    }, userId));

    return createApiResponse(req, result);
  }

  @Post('addMultipleRawLanguages')
  @UseGuards(AuthGuard)
  async addMultipleRawLanguages(@Req() req, @Body() data: AddRawLanguagesDto): Promise<ApiResponse<ILanguage[]>> {
    const result = await this.Service.addMultipleRawLanguages(data);

    return createApiResponse(req, result);
  }

  @Get('getAppLanguagesData')
  async getAppLanguagesData(@Req() req): Promise<ApiResponse<ILanguage[]>> {
    const result = await this.Service.getAppLanguagesData();

    return createApiResponse(req, result);
  }

  @Get('getMultipleEntitiesDataByParentId')
  @UseGuards(AuthGuard)
  async getMultipleEntitiesDataByParentId(
    @Req() req,
    @Query('projectId') projectId: string,
    @Query('parentId') parentId: string,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<IKey[]>> {
    const result = await this.Service.getMultipleEntitiesDataByParentId(projectId, parentId, userId);

    return createApiResponse(req, result);
  }
}
