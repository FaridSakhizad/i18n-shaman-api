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
  UnauthorizedException,
  HttpStatus, UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { Service } from './service';
import { EExportFormats, IEditTag, ILanguage, IProject } from './interfaces/project.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddLanguageDto } from './dto/add-language.dto';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateKeyDto } from './dto/update-key.dto';
import { LanguageVisibilityDto } from './dto/language-visibility.dto';
import { AddMultipleLanguagesDto } from './dto/add-multiple-languages.dto';
import { MultipleLanguageVisibilityDto } from './dto/multiple-languages-visibility.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { IKey } from './interfaces/key.interface';
import { ApiResponse, EStatusCode, IResponse, ProblemDetails } from '../interfaces';
import { GetProjectByIdDto, TSortBy, TSortDirection } from './dto/get-project-by-id.dto';
import { DeleteProjectEntitiesDto } from './dto/delete-entities.dto';
import { GetEntitiesChildrenByIdsDto } from './dto/get-entities-children-by-ids.dto';
import { MoveProjectEntities } from './dto/MoveProjectEntities.dto';
import { AddTagsToEntityDto, CreateTagDto, DeleteTagDto, EditTagDto } from './dto/tags.dto';
import { AssignTagToEntitiesDto } from './dto/tags.dto';

@Controller()
export class TransController {
  constructor(private readonly Service: Service) {}

  @Post('createProject')
  createProject(@Body() createProjectDto: CreateProjectDto): Promise<IProject[]> {
    return this.Service.createProject(createProjectDto);
  }

  @Post('updateProject')
  updateProject(@Body() projectData, @Req() req): Promise<IProject | Error> {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId) {
      throw new UnauthorizedException('Error: Denied');
    }

    return this.Service.updateProject(projectData);
  }

  @Delete('deleteProject')
  deleteProject(@Query('projectId') projectId: string, @Req() req): Promise<IProject[] | Error> {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId) {
      throw new UnauthorizedException('Error: Denied');
    }

    return this.Service.deleteProject(projectId, session.userId);
  }

  @Get('getUserProjects')
  getUserProjects(@Query('userId') userId: string): Promise<IProject[]> {
    return this.Service.getUserProjects({ userId });
  }

  @Get('getUserProjectById')
  getUserProjectById(
    @Query('projectId') projectId: string,
    @Query('subFolderId') subFolderId: string,
    @Query('page') page: string,
    @Query('itemsPerPage') itemsPerPage: string,
    @Query('sortBy') sortBy: TSortBy,
    @Query('sortDirection') sortDirection: TSortDirection,
    @Query('filters') filters: string,
    @Query('tags') tags: string,
    @Query('search') searchQuery: string,
    @Query('search_params') searchParams: string,
    @Req() req,
  ): Promise<IProject> {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId) {
      throw new UnauthorizedException('Error: Denied');
    }

    return this.Service.getUserProjectById({
      projectId,
      page: parseInt(page, 10),
      itemsPerPage: parseInt(itemsPerPage, 10),
      userId: session.userId.toString(),
      subFolderId,
      sortBy,
      sortDirection,
      filters: filters ? filters.split(',') : [],
      tags: tags ? tags.split(',') : [],
      searchQuery,
      searchParams: searchQuery && searchParams ? searchParams.split(',') : [],
    } as GetProjectByIdDto);
  }

  @Get('getKeyData')
  getKeyData(
    @Query('projectId') projectId: string,
    @Query('userId') userId: string,
    @Query('keyId') keyId: string,
    @Req() req,
  ) {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId) {
      throw new UnauthorizedException('Error: Denied');
    }

    return this.Service.getKeyData(projectId, userId, keyId);
  }

  @Get('getEntityContent')
  getEntityContent(
    @Query('projectId') projectId: string,
    @Query('userId') userId: string,
    @Query('componentId') componentId: string,
    @Req() req,
  ) {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId) {
      throw new UnauthorizedException('Error: Denied');
    }

    return this.Service.getEntityContent(projectId, userId, componentId);
  }

  @Post('getEntitiesChildrenByIds')
  getEntitiesChildrenByIds(@Body() getEntitiesChildrenByIdsDto: GetEntitiesChildrenByIdsDto, @Req() req) {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId) {
      throw new UnauthorizedException('Error: Denied');
    }

    const { projectId, userId, ids } = getEntitiesChildrenByIdsDto;

    return this.Service.getEntitiesChildrenByIds(projectId, userId, ids);
  }

  @Post('createProjectEntity')
  createProjectEntity(@Body() createKeyEntity: CreateEntityDto, @Req() req) {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId) {
      throw new UnauthorizedException('Error: Denied');
    }

    return this.Service.createProjectEntity({
      userId: session.userId,
      ...createKeyEntity,
    });
  }

  @Delete('deleteProjectEntities')
  deleteProjectEntities(@Body() body: DeleteProjectEntitiesDto, @Req() req) {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    const { projectId, entityIds } = body;

    return this.Service.deleteProjectEntities(session.userId, projectId, entityIds);
  }

  @Post('duplicateEntities')
  duplicateEntities(@Body() body: DeleteProjectEntitiesDto, @Req() req) {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId) {
      throw new UnauthorizedException('Error: Denied');
    }

    const { projectId, entityIds } = body;

    return this.Service.duplicateEntities(session.userId, projectId, entityIds);
  }

  @Post('moveEntities')
  moveEntities(@Body() body: MoveProjectEntities, @Req() req) {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    const { userId, projectId, entityIds, destinationEntityId } = body;

    return this.Service.moveEntities(userId, projectId, entityIds, destinationEntityId);
  }

  @Post('updateKey')
  updateKey(@Body() updateKeyDto: UpdateKeyDto) {
    return this.Service.updateProjectEntity(updateKeyDto);
  }

  @Post('addLanguage')
  addLanguage(@Body() addLanguageDto: AddLanguageDto) {
    return this.Service.addLanguage(addLanguageDto);
  }

  @Post('updateLanguage')
  updateLanguage(@Body() updateLanguageDto: UpdateLanguageDto): Promise<IProject | Error> {
    return this.Service.updateLanguage(updateLanguageDto);
  }

  @Post('addMultipleLanguages')
  addMultipleProjectLanguages(@Body() addMultipleLanguagesDto: AddMultipleLanguagesDto): Promise<IProject | Error> {
    return this.Service.addMultipleProjectLanguages(addMultipleLanguagesDto);
  }

  @Post('createTag')
  async createTag(
    @Req() req,
    @Body() createTagDto: CreateTagDto,
  ) {
    const nowDate = new Date().toISOString();

    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    const result = await this.Service.createTag({
      ...createTagDto,
      userId: session.userId,
    });

    if (result) {
      return {
        success: true,
        data: {
          ...result.metaData,
        },
        requestId: req.headers['x-request-id'],
        timestamp: nowDate,
        path: req.url as string,
      };
    }

    return {
      type: '',
      title: 'Get Update Password Token Failed',
      status: HttpStatus.OK,
      detail: 'Error: Forbidden',
      code: '403',
      errors: [],
      requestId: req.headers['x-request-id'],
      timestamp: nowDate,
    } as ProblemDetails;
  }

  @Post('addTagsToEntities')
  async addTagsToEntities(
    @Req() req,
    @Body() addTagsToEntityDto: AddTagsToEntityDto,
  ): Promise<ProblemDetails | ApiResponse<any>> {
    const nowDate = new Date().toISOString();

    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    const result = await this.Service.addTagsToEntities({
      ...addTagsToEntityDto,
      userId: session.userId,
    });

    if (result) {
      return {
        success: true,
        data: {
          ...result.metaData,
        },
        requestId: req.headers['x-request-id'],
        timestamp: nowDate,
        path: req.url as string,
      };
    }

    return {
      type: '',
      title: 'Get Update Password Token Failed',
      status: HttpStatus.OK,
      detail: 'Error: Forbidden',
      code: '403',
      errors: [],
      requestId: req.headers['x-request-id'],
      timestamp: nowDate,
    } as ProblemDetails;
  }

  @Post('assignTagToEntities')
  async assignTagToEntities(
    @Req() req,
    @Body() assignTagToEntitiesDto: AssignTagToEntitiesDto,
  ): Promise<ProblemDetails | ApiResponse<any>> {
    const nowDate = new Date().toISOString();

    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    const result = await this.Service.assignTagToEntities({
      ...assignTagToEntitiesDto,
      userId: session.userId,
    });

    if (result) {
      return {
        success: true,
        data: {
          ...result.metaData,
        },
        requestId: req.headers['x-request-id'],
        timestamp: nowDate,
        path: req.url as string,
      };
    }

    return {
      type: '',
      title: 'Get Update Password Token Failed',
      status: HttpStatus.OK,
      detail: 'Error: Forbidden',
      code: '403',
      errors: [],
      requestId: req.headers['x-request-id'],
      timestamp: nowDate,
    } as ProblemDetails;
  }

  @Post('updateTag')
  async updateTag(
    @Req() req,
    @Body() editTagDto: EditTagDto,
  ): Promise<ProblemDetails | ApiResponse<any>> {
    const nowDate = new Date().toISOString();

    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    const result = await this.Service.updateTag({
      ...editTagDto as IEditTag,
      userId: session.userId,
    });

    if (result) {
      return {
        success: true,
        data: {
          ...result.metaData,
        },
        requestId: req.headers['x-request-id'],
        timestamp: nowDate,
        path: req.url as string,
      };
    }

    return {
      type: '',
      title: 'Edit Tag Failed',
      status: HttpStatus.OK,
      detail: 'Error: Forbidden',
      code: '403',
      errors: [],
      requestId: req.headers['x-request-id'],
      timestamp: nowDate,
    } as ProblemDetails;
  }

  @Post('deleteTag')
  async deleteTag(
    @Req() req,
    @Body() deleteTagDto: DeleteTagDto,
  ): Promise<ProblemDetails | ApiResponse<any>> {
    const nowDate = new Date().toISOString();

    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    const result = await this.Service.deleteTag({
      ...deleteTagDto,
      userId: session.userId,
    });

    if (result) {
      return {
        success: true,
        data: {
          ...result.metaData,
        },
        requestId: req.headers['x-request-id'],
        timestamp: nowDate,
        path: req.url as string,
      };
    }

    return {
      type: '',
      title: 'Delete Tag Failed',
      status: HttpStatus.OK,
      detail: 'Error: Forbidden',
      code: '403',
      errors: [],
      requestId: req.headers['x-request-id'],
      timestamp: nowDate,
    } as ProblemDetails;
  }

  @Post('detachTagFromEntities')
  async detachTagFromEntities(
    @Req() req,
    @Body() assignTagToEntitiesDto: AssignTagToEntitiesDto,
  ): Promise<ProblemDetails | ApiResponse<any>> {
    const nowDate = new Date().toISOString();

    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    const result = await this.Service.detachTagFromEntities({
      ...assignTagToEntitiesDto,
      userId: session.userId,
    });

    if (result) {
      return {
        success: true,
        data: {
          ...result.metaData,
        },
        requestId: req.headers['x-request-id'],
        timestamp: nowDate,
        path: req.url as string,
      };
    }

    return {
      type: '',
      title: 'Get Update Password Token Failed',
      status: HttpStatus.OK,
      detail: 'Error: Forbidden',
      code: '403',
      errors: [],
      requestId: req.headers['x-request-id'],
      timestamp: nowDate,
    } as ProblemDetails;
  }

  @Delete('deleteLanguage')
  deleteProjectLanguage(
    @Query('languageId') languageId: string,
    @Query('projectId') projectId: string,
    @Req() req,
  ): Promise<IProject | Error> {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId) {
      throw new UnauthorizedException('Error: Denied');
    }

    return this.Service.deleteProjectLanguage(projectId, languageId);
  }

  @Post('setLanguageVisibility')
  setLanguageVisibility(@Body() languageVisibilityDto: LanguageVisibilityDto): Promise<IProject> {
    return this.Service.setLanguageVisibility(languageVisibilityDto);
  }

  @Post('setMultipleLanguagesVisibility')
  setMultipleLanguagesVisibility(
    @Body() multipleLanguageVisibilityDto: MultipleLanguageVisibilityDto,
  ): Promise<IProject> {
    return this.Service.setMultipleLanguagesVisibility(multipleLanguageVisibilityDto);
  }

  @Get('exportProject')
  async exportProject(
    @Query('projectId') projectId: string,
    @Query('format') format: EExportFormats,
    @Query('format_settings') formatSettings: any = {},
    @Req() req,
    @Res() res: Response,
  ): Promise<IResponse> {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    if (format === EExportFormats.json) {
      return await this.Service.exportProjectToJson(projectId, formatSettings, session.userId, res);
    }

    if (format === EExportFormats.androidXml) {
      return await this.Service.exportProjectToAndroidXml(projectId, formatSettings, session.userId, res);
    }

    if (format === EExportFormats.appleStrings) {
      return await this.Service.exportProjectToAppleStrings(projectId, formatSettings, session.userId, res);
    }

    return {
      statusCode: EStatusCode.Not_Found,
      message: 'Format is not supported',
    };
  }

  @Post('importJsonDataToProject')
  @UseInterceptors(FilesInterceptor('files', 10))
  async importJsonDataToProject(
    @Body('projectId') projectId: string,
    @Body('metaData') metaData: string,
    @Req() req,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    return await this.Service.importDataToProject({ projectId, userId: session.userId, files, metaData });
  }

  @Post('importComponentsDataToProject')
  @UseInterceptors(FilesInterceptor('files', 10))
  async importComponentsDataToProject(
    @Body('projectId') projectId: string,
    @Body('metaData') metaData: string[] | string,
    @Req() req,
    @UploadedFiles() files: Express.Multer.File[] & { code: string },
  ) {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    const metaDataParsed =
      typeof metaData === 'string'
        ? [JSON.parse(metaData as string)]
        : metaData.map((dataItem) => JSON.parse(dataItem));

    return await this.Service.importComponentsDataToProject({
      projectId,
      userId: session.userId,
      files,
      metaData: metaDataParsed,
    });
  }

  @Post('addMultipleRawLanguages')
  async addMultipleRawLanguages(@Body() data: any[], @Req() req) {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Error: Denied');
    }

    return this.Service.addMultipleRawLanguages(data);
  }

  @Get('getAppLanguagesData')
  async getAppLanguagesData(): Promise<ILanguage[]> {
    return this.Service.getAppLanguagesData();
  }

  @Get('getMultipleEntitiesDataByParentId')
  async getMultipleEntitiesDataByParentId(
    @Query('projectId') projectId: string,
    @Query('parentId') parentId: string,
    @Req() req,
  ): Promise<IKey[]> {
    const { session, sessionID } = req;

    if (!session || !sessionID || !session.userId) {
      throw new UnauthorizedException('Error: Denied');
    }

    return this.Service.getMultipleEntitiesDataByParentId(projectId, parentId);
  }
}
