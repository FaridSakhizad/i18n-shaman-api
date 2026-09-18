import { Model, SortOrder } from 'mongoose';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  EFilter,
  ESearchParams,
  IProject,
  IProjectData,
} from './interfaces/project.interface';

import { IKey } from './interfaces/key.interface';

import { IKeyValue } from './interfaces/keyValue.interface';
import { GetProjectByIdDto } from './dto/get-project-by-id.dto';
import { ProjectAccessService } from './project-access.service';
import { KeyValueService } from './key-value.service';

@Injectable()
export class ProjectReadService {
  constructor(
    @Inject('PROJECT_MODEL')
    private projectModel: Model<IProject>,
    @Inject('KEY_MODEL')
    private keyModel: Model<IKey> & { findWithNoOrEmptyValues: () => Promise<IKeyValue[]> },
    @Inject('KEY_VALUE_MODEL')
    private keyValueModel: Model<IKeyValue>,
    private readonly projectAccessService: ProjectAccessService,
    private readonly keyValueService: KeyValueService,
  ) {}

  private getActiveProjectFilter(userId: string, projectId?: string) {
    return this.projectAccessService.getActiveProjectFilter(userId, projectId);
  }

  async assertActiveProject(userId: string, projectId: string): Promise<IProject> {
    return this.projectAccessService.assertActiveProject(userId, projectId);
  }

  getProjectLanguageIds(project: IProject): string[] {
    return this.projectAccessService.getProjectLanguageIds(project);
  }

  async getAggregatedValues(userId: string, projectId: string, parentIds: string[], keyIds?: string[], languageIds?: string[]) {
    return this.keyValueService.getAggregatedValues(userId, projectId, parentIds, keyIds, languageIds);
  }

  async getUserProjectById(params: GetProjectByIdDto, userId: string): Promise<IProjectData> {
    const {
      projectId,
      page,
      itemsPerPage,
      subFolderId,
      sortBy,
      sortDirection = 'asc',
      filters,
      tags = [],
      searchQuery,
      searchParams,
    } = params;

    const project = await this.projectModel
      .findOne(this.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    let upstreamParents: IKey[];
    let subfolderModel: IKey;

    if (subFolderId && subFolderId !== projectId) {
      subfolderModel = await this.keyModel.findOne({ userId, projectId, id: subFolderId });

      const parentIds = subfolderModel.pathCache.replace('#', projectId).split('/');

      upstreamParents = await this.keyModel.find(
        { userId, projectId, id: parentIds },
        {
          id: 1,
          label: 1,
          projectId: 1,
          parentId: 1,
          pathCache: 1,
          type: 1,
          values: 1,
          _id: 0,
        },
      );
    }

    const parentId = subFolderId || projectId;

    const sortParams: { [key: string]: SortOrder | { $meta: any } } = {
      type: 'asc',
    };

    if (!sortBy || sortBy === 'name') {
      sortParams.label = sortDirection;
    }

    if (sortBy === 'type') {
      sortParams.type = sortDirection;
    }

    if (sortBy === 'created') {
      sortParams.createdAt = sortDirection;
    }

    if (sortBy === 'updated') {
      sortParams.updatedAt = sortDirection;
    }

    const filterData = {};

    if (filters && filters.length > 0) {
      filters.forEach((item: string) => {
        filterData[item] = true;
      });
    }

    const filterParams: any = {};

    if (filterData[EFilter.hideComponents] || filterData[EFilter.hideFolders] || filterData[EFilter.hideKeys]) {
      filterParams.type = new Set(['string', 'folder', 'component']);

      if (filterData[EFilter.hideComponents]) {
        filterParams.type.delete('component');
      }

      if (filterData[EFilter.hideFolders]) {
        filterParams.type.delete('folder');
      }

      if (filterData[EFilter.hideKeys]) {
        filterParams.type.delete('string');
      }

      filterParams.type = [...filterParams.type];
    }

    const parentIdSettings = searchQuery && searchQuery.length > 0 ? {} : { parentId };

    const findParams = {
      userId,
      projectId,
      ...parentIdSettings,
      ...filterParams,
    };

    const { languages: projectLanguages } = project;
    const projectLanguageIds = this.getProjectLanguageIds(project);

    const keyIdsToExclude = [];

    if (filterData[EFilter.hideEmpty]) {
      const emptyKeys = await this.keyModel.aggregate([
        {
          $match: {
            userId,
            projectId,
            parentId,
            type: 'string',
          },
        },
        {
          $lookup: {
            from: 'keyvalues',
            let: { keyId: '$id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$keyId', '$$keyId'] },
                      { $eq: ['$userId', userId] },
                      { $eq: ['$projectId', projectId] },
                      { $in: ['$languageId', projectLanguageIds] },
                    ],
                  },
                },
              },
            ],
            as: 'values',
          },
        },
        {
          $match: {
            $or: [
              { values: { $eq: [] } },
              {
                $expr: {
                  $allElementsTrue: {
                    $map: {
                      input: '$values',
                      as: 'val',
                      in: { $eq: ['$$val.content', ''] },
                    },
                  },
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            id: 1,
          },
        },
      ]);

      keyIdsToExclude.push(...emptyKeys.map(({ id }) => id));
    }

    if (filterData[EFilter.hidePartiallyPopulated]) {
      const partiallyPopulatedKeys = await this.keyModel.aggregate([
        {
          $match: {
            userId,
            projectId,
            parentId,
            type: 'string',
          },
        },
        {
          $lookup: {
            from: 'keyvalues',
            let: { keyId: '$id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$keyId', '$$keyId'] },
                      { $eq: ['$userId', userId] },
                      { $eq: ['$projectId', projectId] },
                      { $in: ['$languageId', projectLanguageIds] },
                    ],
                  },
                },
              },
            ],
            as: 'values',
          },
        },
        {
          $addFields: {
            languageIds: {
              $setUnion: '$values.languageId',
            },
          },
        },
        {
          $match: {
            $expr: {
              $and: [
                {
                  $lt: [{ $size: '$languageIds' }, projectLanguages.length],
                },
                {
                  $gt: [{ $size: '$languageIds' }, 0],
                },
              ],
            },
          },
        },
        {
          $project: {
            _id: 0,
            id: 1,
          },
        },
      ]);

      keyIdsToExclude.push(...partiallyPopulatedKeys.map(({ id }) => id));
    }

    if (filterData[EFilter.hideFullyPopulated]) {
      const fullyPopulatedKeys = await this.keyModel.aggregate([
        {
          $match: {
            userId,
            projectId,
            parentId,
            type: 'string',
          },
        },
        {
          $lookup: {
            from: 'keyvalues',
            let: { keyId: '$id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$keyId', '$$keyId'] },
                      { $eq: ['$userId', userId] },
                      { $eq: ['$projectId', projectId] },
                      { $in: ['$languageId', projectLanguageIds] },
                    ],
                  },
                },
              },
            ],
            as: 'values',
          },
        },
        {
          $addFields: {
            languageIds: {
              $setUnion: '$values.languageId',
            },
          },
        },
        {
          $match: {
            $expr: {
              $eq: [{ $size: '$languageIds' }, projectLanguages.length],
            },
          },
        },
        {
          $project: {
            _id: 0,
            id: 1,
          },
        },
      ]);

      keyIdsToExclude.push(...fullyPopulatedKeys.map(({ id }) => id));
    }

    Object.assign(findParams, {
      id: { $nin: keyIdsToExclude },
    });

    let searchDbQueryParams: { $regex?: string; $options?: string } | null = null;

    const searchParamsData = {};

    searchParams.forEach((item: string) => {
      searchParamsData[item] = true;
    });

    if (searchQuery && searchQuery.length > 0) {
      searchDbQueryParams = {};

      searchDbQueryParams.$regex = searchQuery;

      if (!searchParamsData[ESearchParams.caseSensitive]) {
        searchDbQueryParams.$options = 'i';
      }

      if (searchParamsData[ESearchParams.exactMatch]) {
        searchDbQueryParams.$regex = `^${searchQuery}$`;
      }

      if (
        searchParamsData[ESearchParams.skipKeys] ||
        searchParamsData[ESearchParams.skipFolders] ||
        searchParamsData[ESearchParams.skipComponents]
      ) {
        findParams.type = new Set(findParams.type || ['string', 'folder', 'component']);

        if (searchParamsData[ESearchParams.skipKeys]) {
          findParams.type.delete('string');
        }

        if (searchParamsData[ESearchParams.skipComponents]) {
          findParams.type.delete('component');
        }

        if (searchParamsData[ESearchParams.skipFolders]) {
          findParams.type.delete('folder');
        }

        findParams.type = [...findParams.type];
      }

      findParams.label = searchDbQueryParams;
    }

    const sortParamsForAggregation = {};

    Object.entries(sortParams).map(([key, value]) => {
      sortParamsForAggregation[key] = value === 'asc' ? 1 : -1;
    });

    if (tags.length > 0) {
      findParams['tags.id'] = { $in: tags.filter(Boolean) };
    }

    const searchResult = await this.keyModel.aggregate([
      {
        $match: {
          userId,
          projectId,
        },
      },
      {
        $lookup: {
          from: 'keyvalues',
          let: { keyId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$keyId', '$$keyId'] },
                    { $eq: ['$userId', userId] },
                    { $eq: ['$projectId', projectId] },
                    { $in: ['$languageId', projectLanguageIds] },
                  ],
                },
              },
            },
          ],
          as: 'values',
        },
      },
      {
        $match: {
          $or: [findParams, { 'values.value': searchDbQueryParams }],
        },
      },
      {
        $sort: sortParamsForAggregation,
      },
      {
        $facet: {
          items: [{ $skip: page * itemsPerPage }, { $limit: itemsPerPage }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const {
      items: keys,
      totalCount: [{ count: keysTotalCount } = { count: 0 }],
    } = searchResult[0];

    const foundKeyIds = keys.map(({ id }) => id);

    const aggregatedValuesParentIds = [parentId, ...foundKeyIds];

    const aggregatedValues = searchParamsData[ESearchParams.skipValues]
      ? [[]]
      : await this.getAggregatedValues(userId, projectId, aggregatedValuesParentIds, undefined, this.getProjectLanguageIds(project));

    return {
      ...project.toObject(),
      keys: [...keys],
      values: aggregatedValues[0],
      keysTotalCount,
      upstreamParents,
      subfolder: subfolderModel,
    } as unknown as IProjectData;
  }

}
