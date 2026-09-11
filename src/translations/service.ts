import * as archiver from 'archiver';

import { Model, SortOrder } from 'mongoose';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { js2xml } from 'xml-js';

import {
  EFilter,
  ESearchParams,
  IAddTagsToEntities,
  IAssignTagsToEntities, ICreateTag,
  IDeleteTag,
  IEditTag,
  ILanguage,
  ILanguageMap,
  IProject,
  IProjectData,
  IProjectLanguage,
  IStructuredProjectData, ITag,
} from './interfaces/project.interface';

import { IKey } from './interfaces/key.interface';

import { CreateProjectDto } from './dto/create-project.dto';
import { AddLanguageDto } from './dto/add-language.dto';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateKeyDto } from './dto/update-key.dto';
import { LanguageVisibilityDto } from './dto/language-visibility.dto';
import { AddMultipleLanguagesDto } from './dto/add-multiple-languages.dto';
import { MultipleLanguageVisibilityDto } from './dto/multiple-languages-visibility.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { IRawLanguage } from './interfaces/rawLanguage.interface';
import { IKeyValue } from './interfaces/keyValue.interface';
import { KeyHelperService } from './keyHelper.service';
import { GetProjectByIdDto } from './dto/get-project-by-id.dto';
import {
  AddRawLanguagesDto,
  ExportFormatSettings,
  IImportComponentsRequest,
  IImportedDocument,
  IImportRequest,
  IImportResult,
  JsonImportFileMetaDataItem,
  JsonImportFileMetaDataMap,
  UpdateProjectDto,
} from './dto/project-api.dto';

@Injectable()
export class Service {
  constructor(
    @Inject('PROJECT_MODEL')
    private projectModel: Model<IProject>,
    @Inject('KEY_MODEL')
    private keyModel: Model<IKey> & { findWithNoOrEmptyValues: () => Promise<IKeyValue[]> },
    @Inject('KEY_VALUE_MODEL')
    private keyValueModel: Model<IKeyValue>,
    @Inject('RAW_LANGUAGE_MODEL')
    private rawLanguageModel: Model<IRawLanguage>,
    private readonly keyHelperService: KeyHelperService,
  ) {}

  private getActiveProjectFilter(userId: string, projectId?: string) {
    return {
      userId,
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
    };
  }

  async assertActiveProject(userId: string, projectId: string): Promise<IProject> {
    const project = await this.projectModel
      .findOne(this.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getPathCacheContainsEntityFilter(entityIds: string[]) {
    return {
      $or: entityIds.map((id) => ({
        pathCache: {
          $regex: `(^|/)${this.escapeRegExp(id)}(/|$)`,
        },
      })),
    };
  }

  private findEntityIdInPathCache(pathCache: string, entityIds: string[]): string | null {
    const pathSegments = pathCache.split('/').filter(Boolean);

    return entityIds.find((id) => pathSegments.includes(id)) || null;
  }

  private assertAllEntitiesFound(entities: IKey[], entityIds: string[]): void {
    const foundIds = new Set(entities.map(({ id }) => id));
    const hasMissingEntities = entityIds.some((id) => !foundIds.has(id));

    if (hasMissingEntities) {
      throw new NotFoundException('Entity not found');
    }
  }

  getProjectLanguageIds(project: IProject): string[] {
    return (project.languages || []).map(({ id }) => id);
  }

  async getUserProjects(userId: string): Promise<IProject[]> {
    return this.projectModel.find(this.getActiveProjectFilter(userId)).exec();
  }

  async createProject(createProjectDto: CreateProjectDto, userId: string): Promise<IProject[]> {
    const createdProject = new this.projectModel({
      ...createProjectDto,
      userId,
    });

    await createdProject.save();

    const userProjects = await this.projectModel.find(this.getActiveProjectFilter(userId));

    return userProjects;
  }

  async updateProject(data: UpdateProjectDto & { userId?: string }, userId: string): Promise<IProject> {
    const { projectId, userId: _ignoredUserId, ...dataPatch } = data;

    const project = await this.projectModel.findOneAndUpdate(
      this.getActiveProjectFilter(userId, projectId),
      dataPatch,
      { new: true },
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async deleteProject(projectId: string, userId: string): Promise<IProject[]> {
    const deleteResult = await this.projectModel.findOneAndUpdate(
      this.getActiveProjectFilter(userId, projectId),
      {
        $set: {
          status: 'deleted',
          deletedAt: new Date(),
          deletedBy: userId,
        },
      },
      { new: true },
    );

    if (!deleteResult) {
      throw new NotFoundException('Project not found');
    }

    const userProjects = await this.projectModel.find(this.getActiveProjectFilter(userId));

    return userProjects;
  }

  async createTag(data: ICreateTag, userId: string) {
    const { projectId, tagName } = data;

    const project = await this.projectModel
      .findOne(this.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.tags) {
      project.tags = []
    }

    const colorIndex = Math.floor(Math.random() * (24 - 1 + 1) + 1);

    project.tags.push({
      id: Math.random().toString(16).substring(2),
      name: tagName,
      color: `color${colorIndex}`,
    });

    await project.save();

    return {
      tags: project.tags,
    };
  }

  async addTagsToEntities(data: IAddTagsToEntities, userId: string) {
    const { projectId, entityIds, tagName, color } = data;

    const project = await this.projectModel
      .findOne(this.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const { tags = [] } = project;

    const tagExists = (tags && tags.length) ? tags.find((tag: ITag) => tag.name === tagName) : null;

    const newTagId = Math.random().toString(16).substring(2);
    const tagId = tagExists ? tagExists.id : newTagId;

    if (!tagExists) {
      const newTag: ITag = {
        id: tagId,
        name: tagName,
        color,
      };

      if (!project.tags) {
        project.tags = [];
      }

      project.tags.push(newTag);

      await project.save();
    }

    const entities = await this.keyModel.find({
      userId,
      projectId,
      id: entityIds,
    });

    this.assertAllEntitiesFound(entities, entityIds);

    await Promise.all(entities.map((entity) => {
      if (!entity.tags) {
        entity.tags = [];
      }

      if (entity.tags.every((tag) => tag.id !== tagId)) {
        entity.tags.push({
          id: tagId,
        });
      }

      return entity.save();
    }));

    return {
      tags: project.tags,
    };
  }

  async assignTagToEntities(data: IAssignTagsToEntities, userId: string) {
    const { projectId, entityIds, tagId } = data;

    const project = await this.projectModel.findOne({
      ...this.getActiveProjectFilter(userId, projectId),
      'tags.id': tagId,
    });

    if (!project) {
      throw new NotFoundException('Project or Tag not found');
    }

    const entities = await this.keyModel.find({
      userId,
      projectId,
      id: entityIds,
    });

    this.assertAllEntitiesFound(entities, entityIds);

    const filteredEntities = entities.filter(({ tags }) => !tags || tags.every((tag) => tag.id !== tagId));

    await Promise.all(filteredEntities.map((entity) => {
      if (!entity.tags) {
        entity.tags = [];
      }

      entity.tags.push({
        id: tagId,
      });

      return entity.save();
    }));

    return {
      entities: filteredEntities,
    };
  }

  async detachTagFromEntities(data: IAssignTagsToEntities, userId: string) {
    const {
      projectId,
      entityIds,
      tagId,
    } = data;

    const project = await this.projectModel.findOne({
      ...this.getActiveProjectFilter(userId, projectId),
      'tags.id': tagId,
    });

    if (!project) {
      throw new NotFoundException('Project or Tag not found');
    }

    const entities = await this.keyModel.find({
      userId,
      projectId,
      id: entityIds,
    });

    this.assertAllEntitiesFound(entities, entityIds);

    await Promise.all(entities.map((entity) => {
      entity.tags = (entity.tags || []).filter((tag) => tag.id !== tagId);

      return entity.save();
    }));

    return {
      entities,
    };
  }

  async deleteTag(data: IDeleteTag, userId: string) {
    const {
      projectId,
      tagId,
    } = data;

    const project = await this.projectModel
      .findOne(this.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.tags = project.tags.filter((tag) => tag.id !== tagId);

    await project.save();

    const entities = await this.keyModel.find({
      userId,
      projectId,
      'tags.id': tagId,
    });

    await Promise.all(entities.map((entity: IKey) => {
      entity.tags = entity.tags.filter((tag) => tag.id !== tagId);

      return entity.save();
    }));

    return {
      tags: project.tags,
    };
  }

  async updateTag(data: IEditTag, userId: string) {
    const {
      projectId,
      id,
      name,
      color,
      customColor,
    } = data;

    const project = await this.projectModel.findOne({
      ...this.getActiveProjectFilter(userId, projectId),
      'tags.id': id,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const tag = project.tags.find((tag) => tag.id === id);

    tag.name = name;
    tag.color = color;
    tag.customColor = customColor;

    await project.save();

    return {
      ok: 'ok',
    };
  }

  async createProjectEntity(createEntityDto: CreateEntityDto, userId: string) {
    const { id, projectId } = createEntityDto;

    const createdAt = +new Date();

    const { values, ...keyData } = createEntityDto;

    const project = await this.projectModel.findOne(this.getActiveProjectFilter(userId, projectId));

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const createdKey = new this.keyModel({
      ...keyData,
      userId,
      updatedAt: createdAt,
      createdAt,
    });

    const keyCreateResult = await createdKey.save();

    const keyValuesData = values.map((value) => ({
      id: Math.random().toString(16).substring(2),
      ...value,
      userId,
      projectId,
      keyId: id,
      pathCache: `${keyCreateResult.pathCache}/${keyCreateResult.id}`,
    }));

    const valuesInsertResult = await this.keyValueModel.insertMany(keyValuesData);

    return {
      valuesInsertResult,
      keyCreateResult,
    };
  }

  async deleteProjectEntities(userId: string, projectId: string, entityIds: string[]) {
    await this.assertActiveProject(userId, projectId);

    const entities = await this.keyModel.find({
      userId,
      projectId,
      id: entityIds,
    });

    this.assertAllEntitiesFound(entities, entityIds);

    const childrenEntitiesDeleteResult = await this.keyModel.deleteMany({
      userId,
      projectId,
      ...this.getPathCacheContainsEntityFilter(entityIds),
    });

    const childrenValuesDeleteResult = await this.keyValueModel.deleteMany({
      userId,
      projectId,
      ...this.getPathCacheContainsEntityFilter(entityIds),
    });

    const entityDeleteResult = await this.keyModel.deleteMany({
      userId,
      projectId,
      id: entityIds,
    });

    return {
      data: {
        root: entityDeleteResult,
        values: childrenValuesDeleteResult,
        children: childrenEntitiesDeleteResult,
      },
    };
  }

  generateLabelForCopy(label: string): string {
    const isFirstCopy = /copy$/.test(label);

    if (isFirstCopy) {
      return `${label} (1)`;
    }

    const indexedCopyMatch = label.match(/(\()(\d*)(\))$/gi);

    if (indexedCopyMatch !== null) {
      const index = 1 + parseInt(indexedCopyMatch[0].replace('(', '').replace(')', ''));

      return label.replace(/(\()(\d*)(\))$/gi, `(${index})`);
    }

    return `${label} copy`;
  }

  async duplicateEntities(userId: string, projectId: string, entityIds: string[]) {
    await this.assertActiveProject(userId, projectId);

    const rootEntities = await this.keyModel.find({
      userId,
      projectId,
      id: entityIds,
    });

    this.assertAllEntitiesFound(rootEntities, entityIds);

    const createdAt = +new Date();

    const rootIdToCloneIdMap = new Map();

    const clonedRootEntitiesData = rootEntities.map((entity) => {
      const { _id, ...data } = entity.toObject();

      const newId = Math.random().toString(16).substring(2);

      rootIdToCloneIdMap.set(data.id, newId);

      return {
        ...data,
        id: newId,
        label: this.generateLabelForCopy(data.label),
        updatedAt: createdAt,
        createdAt,
      };
    });

    const clonedRootEntitiesOps = clonedRootEntitiesData.map((document) => ({ insertOne: { document } }));

    await this.keyModel.bulkWrite(clonedRootEntitiesOps, { ordered: false });

    const rootEntitiesValues = await this.keyValueModel
      .find({
        userId,
        projectId,
        keyId: entityIds,
      })
      .lean<IKeyValue[]>();

    const clonedRootEntityValues = rootEntitiesValues.map((document) => {
      const { _id, keyId, pathCache, ...data } = document;

      const cloneEntityId = rootIdToCloneIdMap.get(keyId);

      return {
        ...data,
        id: Math.random().toString(16).substring(2),
        keyId: cloneEntityId,
        pathCache: pathCache.replace(keyId, cloneEntityId),
      };
    });

    await this.keyValueModel.insertMany(clonedRootEntityValues);

    /* Cloning Children Entities */

    const childEntities = await this.keyModel
      .find({
        userId,
        projectId,
        ...this.getPathCacheContainsEntityFilter(entityIds),
      })
      .lean();

    const clonedChildEntitiesData = childEntities.map((entity) => {
      const { _id, ...data } = entity;

      const newId = Math.random().toString(16).substring(2);

      rootIdToCloneIdMap.set(data.id, newId);

      return {
        ...data,
        id: newId,
        updatedAt: createdAt,
        createdAt,
      };
    });

    clonedChildEntitiesData.forEach((entity) => {
      const { parentId, pathCache } = entity;

      entity.parentId = rootIdToCloneIdMap.get(parentId);

      const newPathCache = pathCache
        .split('/')
        .map((id) => (rootIdToCloneIdMap.has(id) ? rootIdToCloneIdMap.get(id) : id))
        .join('/');

      entity.pathCache = newPathCache;
    });

    const clonedChildEntitiesOps = clonedChildEntitiesData.map((document) => ({ insertOne: { document } }));

    await this.keyModel.bulkWrite(clonedChildEntitiesOps, { ordered: false });

    const childEntitiesValues = await this.keyValueModel
      .find({
        userId,
        projectId,
        ...this.getPathCacheContainsEntityFilter(entityIds),
      })
      .lean();

    const clonedChildEntitiesValuesData = childEntitiesValues.map((keyValue) => {
      const { _id, parentId, keyId, pathCache, ...data } = keyValue;

      const newPathCache = pathCache
        .split('/')
        .map((id) => (rootIdToCloneIdMap.has(id) ? rootIdToCloneIdMap.get(id) : id))
        .join('/');

      return {
        ...data,
        id: Math.random().toString(16).substring(2),
        parentId: rootIdToCloneIdMap.get(parentId),
        keyId: rootIdToCloneIdMap.get(keyId),
        pathCache: newPathCache,
      };
    });

    await this.keyValueModel.insertMany(clonedChildEntitiesValuesData);

    return {
      data: 'CLONING OK',
    };
  }

  getMovedRootEntitiesPathCache(destinationDocument: { pathCache: string; id: string }) {
    return `${destinationDocument.pathCache}/${destinationDocument.id}`;
  }

  getMovedChildPathCache(
    document: { pathCache: string; matchedRootId: string },
    destinationDocument: { pathCache: string; id: string },
  ) {
    const { pathCache: originalPathCache, matchedRootId } = document;
    const { pathCache: destinationPathCache } = destinationDocument;

    const startIndex = originalPathCache.indexOf(matchedRootId);

    const relativePathCache = originalPathCache.substring(startIndex);

    const destinationDocumentId = destinationDocument.id === '#' ? '' : `${destinationDocument.id}/`;

    return `${destinationPathCache}/${destinationDocumentId}${relativePathCache}`;
  }

  async moveEntities(userId: string, projectId: string, entityIds: string[], destinationEntityId: string) {
    await this.assertActiveProject(userId, projectId);

    const destinationDocument = await this.keyModel
      .findOne({
        userId,
        projectId,
        id: destinationEntityId,
      })
      .lean<IKey>();

    const rootEntities = await this.keyModel
      .find({
        userId,
        projectId,
        id: entityIds,
      })
      .lean<IKey[]>();

    const docIsMovingToRoot = projectId === destinationEntityId;

    if (!docIsMovingToRoot && !destinationDocument) {
      throw new NotFoundException('Destination entity not found');
    }

    this.assertAllEntitiesFound(rootEntities as IKey[], entityIds);

    if (
      !docIsMovingToRoot
      && (
        entityIds.includes(destinationEntityId)
        || this.findEntityIdInPathCache(`${destinationDocument.pathCache}/${destinationDocument.id}`, entityIds)
      )
    ) {
      throw new BadRequestException({
        error: 'Move Failed',
        message: 'Entity cannot be moved into itself or its child',
      });
    }

    const rootEntitiesOps = rootEntities.map((document) => {
      return {
        updateOne: {
          filter: {
            _id: document._id,
          },
          update: {
            $set: {
              parentId: destinationEntityId,
              pathCache: docIsMovingToRoot ? '#' : this.getMovedRootEntitiesPathCache(destinationDocument),
            },
          },
        },
      };
    });

    await this.keyModel.bulkWrite(rootEntitiesOps, { ordered: false });

    const rootEntitiesValues = await this.keyValueModel
      .find({
        userId,
        projectId,
        keyId: entityIds,
      })
      .lean();

    const rootEntitiesValuesOps = rootEntitiesValues.map((document) => {
      return {
        updateOne: {
          filter: {
            _id: document._id,
          },
          update: {
            $set: {
              parentId: destinationEntityId,
              pathCache: docIsMovingToRoot
                ? `#/${document.keyId}`
                : this.getMovedRootEntitiesPathCache(destinationDocument),
            },
          },
        },
      };
    });

    await this.keyValueModel.bulkWrite(rootEntitiesValuesOps, { ordered: false });

    /* MOVING CHILDREN */
    const childEntities = await this.keyModel
      .find({
        userId,
        projectId,
        ...this.getPathCacheContainsEntityFilter(entityIds),
      })
      .lean();

    const childEntitiesOps = childEntities.map((document) => {
      const matchedRootId = this.findEntityIdInPathCache(document.pathCache, entityIds);

      if (!matchedRootId) {
        throw new NotFoundException('Entity not found');
      }

      return {
        updateOne: {
          filter: {
            _id: document._id,
          },
          update: {
            $set: {
              pathCache: docIsMovingToRoot
                ? this.getMovedChildPathCache({ ...document, matchedRootId }, { pathCache: '#', id: '#' } as IKey)
                : this.getMovedChildPathCache({ ...document, matchedRootId }, destinationDocument),
            },
          },
        },
      };
    });

    await this.keyModel.bulkWrite(childEntitiesOps, { ordered: false });

    const childEntitiesValues = await this.keyValueModel
      .find({
        userId,
        projectId,
        ...this.getPathCacheContainsEntityFilter(entityIds),
      })
      .lean();

    const childEntitiesValuesOps = childEntitiesValues.map((document) => {
      const matchedRootId = this.findEntityIdInPathCache(document.pathCache, entityIds);

      if (!matchedRootId) {
        throw new NotFoundException('Entity not found');
      }

      return {
        updateOne: {
          filter: {
            _id: document._id,
          },
          update: {
            $set: {
              pathCache: docIsMovingToRoot
                ? this.getMovedChildPathCache({ ...document, matchedRootId }, { pathCache: '#', id: '#' } as IKey)
                : this.getMovedChildPathCache({ ...document, matchedRootId }, destinationDocument),
            },
          },
        },
      };
    });

    await this.keyValueModel.bulkWrite(childEntitiesValuesOps, { ordered: false });

    return {
      data: 'MOVING OK',
    };
  }

  async getAggregatedValues(userId: string, projectId: string, parentIds: string[], keyIds?: string[], languageIds?: string[]) {
    const aggregatedValues = await this.keyValueModel.aggregate([
      {
        $match: {
          userId,
          projectId,
          ...(parentIds ? { parentId: { $in: parentIds } } : {}),
          ...(keyIds ? { keyId: { $in: keyIds } } : {}),
          ...(languageIds ? { languageId: { $in: languageIds } } : {}),
        },
      },
      {
        $group: {
          _id: '$keyId',
          items: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          parentId: '$_id',
          items: 1,
        },
      },
      {
        $project: {
          parentId: 1,
          items: {
            $arrayToObject: {
              $map: {
                input: '$items',
                as: 'item',
                in: ['$$item.languageId', '$$item'],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          result: { $push: { k: '$parentId', v: '$items' } },
        },
      },
      {
        $project: {
          result: { $arrayToObject: '$result' },
        },
      },
      {
        $replaceRoot: { newRoot: '$result' },
      },
    ]);

    return aggregatedValues;
  }

  async updateProjectEntity(updateKeyDto: UpdateKeyDto, userId: string) {
    const { id, label, description, values, projectId, parentId } = updateKeyDto;

    const project = await this.assertActiveProject(userId, projectId);

    const updatedAt = +new Date();

    await this.keyModel.updateOne(
      {
        id,
        projectId,
        userId,
      },
      {
        label,
        description,
        updatedAt,
      },
    );

    const key = await this.keyModel.findOne({ id, projectId, userId }).lean<IKey>();

    if (!key) {
      throw new NotFoundException('Entity not found');
    }

    const bulkOps = values.map((item) => {
      const valuePatch = {
        ...item,
        userId,
        projectId,
        keyId: id,
        parentId,
      };
      const $setOnInsert = {};

      if (!item.id) {
        $setOnInsert['id'] = Math.random().toString(16).substring(2);
      }

      if (!item.pathCache) {
        $setOnInsert['pathCache'] = `${key.pathCache}/${key.id}`;
      }

      return {
        updateOne: {
          filter: {
            id: item.id,
            userId,
            projectId,
            keyId: id,
          },
          update: {
            $set: valuePatch,
            $setOnInsert,
          },
          upsert: true,
        },
      };
    });

    await this.keyValueModel.bulkWrite(bulkOps);

    const aggregatedValues = await this.getAggregatedValues(userId, projectId, [parentId], undefined, this.getProjectLanguageIds(project));

    return {
      key,
      values: aggregatedValues.length > 0 && aggregatedValues[0][id] ? aggregatedValues[0][id] : [],
    };
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

  async getKeyData(projectId: string, userId: string, keyId: string) {
    const project = await this.assertActiveProject(userId, projectId);

    const result = await this.keyModel.findOne({
      projectId,
      userId,
      id: keyId,
    });

    const aggregatedValues = await this.getAggregatedValues(userId, projectId, null, [keyId], this.getProjectLanguageIds(project));

    return {
      key: result,
      values: aggregatedValues[0],
    };
  }

  async getEntityContent(projectId: string, userId: string, componentId: string) {
    const project = await this.assertActiveProject(userId, projectId);

    const keys = await this.keyModel
      .find({
        projectId,
        userId,
        parentId: componentId,
      })
      .sort({ type: 'asc', label: 'asc' });

    const aggregatedValues = await this.getAggregatedValues(userId, projectId, [componentId], undefined, this.getProjectLanguageIds(project));

    return {
      keys,
      values: aggregatedValues[0],
    };
  }

  async getEntitiesChildrenByIds(projectId: string, userId: string, entityIds: string[]) {
    await this.assertActiveProject(userId, projectId);

    const keys = await this.keyModel.find({
      projectId,
      userId,
      parentId: entityIds,
    });

    return keys;
  }

  async addLanguage(addLanguageDto: AddLanguageDto, userId: string) {
    const { projectId, id, label, baseLanguage, code } = addLanguageDto;

    await this.assertActiveProject(userId, projectId);

    const result = await this.projectModel.updateOne(
      this.getActiveProjectFilter(userId, projectId),
      {
        $addToSet: {
          languages: {
            id,
            label,
            baseLanguage,
            code,
            visible: true,
          },
        },
      },
    );

    return result;
  }

  async updateLanguage(updateLanguageDto: UpdateLanguageDto, userId: string): Promise<IProject> {
    const { projectId, ...language } = updateLanguageDto;

    const result = await this.projectModel.findOneAndUpdate(
      { ...this.getActiveProjectFilter(userId, projectId), 'languages.id': language.id },
      { $set: { 'languages.$': language } },
      { new: true },
    );

    if (!result) {
      throw new NotFoundException('Project not found');
    }

    return result;
  }

  async addMultipleProjectLanguages(addMultipleLanguagesDto: AddMultipleLanguagesDto, userId: string): Promise<IProject> {
    const { projectId, languages } = addMultipleLanguagesDto;

    const result = await this.projectModel
      .findOneAndUpdate(this.getActiveProjectFilter(userId, projectId), { $push: { languages: { $each: languages } } }, { new: true })
      .exec();

    if (!result) {
      throw new NotFoundException('Project not found');
    }

    return result;
  }

  async deleteProjectLanguage(projectId: string, languageId: string, userId: string): Promise<IProject> {
    const result = await this.projectModel
      .findOneAndUpdate(
        {
          ...this.getActiveProjectFilter(userId, projectId),
          'languages.id': languageId,
        },
        { $pull: { languages: { id: languageId } } },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Project or Language not found');
    }

    return result;
  }

  async setLanguageVisibility({ projectId, languageId, visible }: LanguageVisibilityDto, userId: string): Promise<IProject> {
    await this.assertActiveProject(userId, projectId);

    const result = await this.projectModel.findOneAndUpdate(
      { ...this.getActiveProjectFilter(userId, projectId), 'languages.id': languageId },
      { $set: { 'languages.$.visible': visible } },
      { new: true },
    );

    return result;
  }

  async setMultipleLanguagesVisibility({ projectId, data }: MultipleLanguageVisibilityDto, userId: string): Promise<IProject> {
    await this.assertActiveProject(userId, projectId);

    const bulkOps = data.map(({ languageId, visible }) => {
      return {
        updateOne: {
          filter: { ...this.getActiveProjectFilter(userId, projectId), 'languages.id': languageId },
          update: { $set: { 'languages.$.visible': visible } },
        },
      };
    });

    await this.projectModel.bulkWrite(bulkOps);

    return await this.projectModel.findOne(this.getActiveProjectFilter(userId, projectId));
  }

  getShallowFileKeyValueStructure(keys, aggregatedValues, languagesMap) {
    const result = {} as { [key: string]: any };

    for (let i = 0; i < keys.length; i++) {
      const { id, label } = keys[i] as IKey;
      let values = aggregatedValues[id];

      if (!values) {
        continue;
      }

      values = Object.entries(values).map(([, value]) => value) as IKeyValue[];

      for (let j = 0; j < values.length; j++) {
        const { languageId, value } = values[j];

        if (!languagesMap[languageId]) {
          continue;
        }

        const { code, customCode, customCodeEnabled } = languagesMap[languageId];

        const destination = customCodeEnabled ? customCode : code;

        if (!result[destination]) {
          result[destination] = {};
        }

        result[destination][label] = value;
      }
    }

    return result;
  }

  getFolderLanguageKeyValueStructure(components, keys, aggregatedValues, languagesMap) {
    const result = {};

    const aggregatedComponents = {};

    for (let i = 0; i < components.length; i++) {
      const { id } = components[i];
      aggregatedComponents[id] = components[i];
    }

    for (let i = 0; i < keys.length; i++) {
      const { id: keyId, label: keyLabel, parentId: parentComponentId } = keys[i] as IKey;
      let values = aggregatedValues[keyId];

      if (!values) {
        continue;
      }

      values = Object.entries(values).map(([, value]) => value) as IKeyValue[];

      for (let j = 0; j < values.length; j++) {
        const { languageId, value } = values[j];

        if (!languagesMap[languageId]) {
          continue;
        }

        const { code, customCode, customCodeEnabled } = languagesMap[languageId];

        const destinationFolder = customCodeEnabled ? customCode : code;

        if (!result[destinationFolder]) {
          result[destinationFolder] = {};
        }

        const destinationFile = aggregatedComponents[parentComponentId].label;

        if (!result[destinationFolder][destinationFile]) {
          result[destinationFolder][destinationFile] = {};
        }

        result[destinationFolder][destinationFile][keyLabel] = value;
      }
    }

    return result;
  }

  async getMultipleEntitiesDataByParentId(projectId: string, parentId: string, userId: string): Promise<IKey[]> {
    await this.assertActiveProject(userId, projectId);

    const result = await this.keyModel.find({ projectId, parentId, userId });

    return result;
  }

  async getStructuredObjectFromProject(userId: string, project: IProject): Promise<any> {
    const { languages, projectId } = project;

    const languagesMap: ILanguageMap = {};

    for (let i = 0; i < languages.length; i++) {
      const { id, code, customCode, customCodeEnabled } = languages[i];

      languagesMap[id] = {
        id,
        code,
        customCode,
        customCodeEnabled,
      };
    }

    const keys = await this.keyModel.find({ userId, projectId }).lean<IKey[]>();
    const [aggregatedValues] = (await this.getAggregatedValues(userId, projectId, null, null, this.getProjectLanguageIds(project))) || [];

    const structuredProjectData: IStructuredProjectData = {};

    for (let i = 0; i < languages.length; i += 1) {
      const { id, code, customCode, customCodeEnabled } = languages[i];

      const tree = this.keyHelperService.buildHierarchyForJsonExport(keys, aggregatedValues, projectId, id);

      const languageLabel = customCodeEnabled ? customCode : code;

      structuredProjectData[languageLabel] = tree;
    }

    return structuredProjectData;
  }

  async exportProjectToJson(projectId: string, formatSettings: ExportFormatSettings, userId: string, res): Promise<void> {
    const project = await this.projectModel
      .findOne(this.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const structuredData = await this.getStructuredObjectFromProject(userId, project);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=files.zip');

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    for (const [langCode, data] of Object.entries(structuredData)) {
      const containerName = langCode;
      const { localesData, componentsData } = data as IStructuredProjectData;

      const jsonContent = JSON.stringify(localesData, null, 2);
      archive.append(jsonContent, { name: `${containerName}.json` });

      for (const [componentName, componentData] of Object.entries(componentsData)) {
        const jsonContent = JSON.stringify(componentData, null, 2);
        archive.append(jsonContent, { name: `${containerName}/${componentName}.json` });
      }
    }

    await archive.finalize();
  }

  async getXmlReadyLinearDataFromProject(userId: string, project: IProject): Promise<any> {
    const { languages, projectId } = project;

    const languagesMap: ILanguageMap = {};

    for (let i = 0; i < languages.length; i++) {
      const { id, code, customCode, customCodeEnabled } = languages[i];

      languagesMap[id] = {
        id,
        code,
        customCode,
        customCodeEnabled,
      };
    }

    const keys = await this.keyModel.find({ userId, projectId }).lean<IKey[]>();
    const [aggregatedValues] = (await this.getAggregatedValues(userId, projectId, null, null, this.getProjectLanguageIds(project))) || [];

    const structuredProjectData: IStructuredProjectData = {};

    for (let i = 0; i < languages.length; i += 1) {
      const { id, code, customCode, customCodeEnabled } = languages[i];

      const array = this.keyHelperService.buildLinearArrayForXml(keys, aggregatedValues, projectId, id);

      const languageLabel = customCodeEnabled ? customCode : code;

      structuredProjectData[languageLabel] = array;
    }

    return structuredProjectData;
  }

  async getStringsReadyArrayFromProject(userId: string, project: IProject): Promise<any> {
    const { languages, projectId } = project;

    const languagesMap: ILanguageMap = {};

    for (let i = 0; i < languages.length; i++) {
      const { id, code, customCode, customCodeEnabled } = languages[i];

      languagesMap[id] = {
        id,
        code,
        customCode,
        customCodeEnabled,
      };
    }

    const keys = await this.keyModel.find({ userId, projectId }).lean<IKey[]>();

    const [aggregatedValues] = (await this.getAggregatedValues(userId, projectId, null, null, this.getProjectLanguageIds(project))) || [];

    const structuredProjectData: IStructuredProjectData = {};

    for (let i = 0; i < languages.length; i += 1) {
      const { id, code, customCode, customCodeEnabled } = languages[i];

      const array = this.keyHelperService.buildLinearKeyValueArray(keys, aggregatedValues, projectId, id);

      const languageLabel = customCodeEnabled ? customCode : code;

      structuredProjectData[languageLabel] = array;
    }

    return structuredProjectData;
  }

  async exportProjectToAndroidXml(projectId: string, formatSettings: ExportFormatSettings, userId: string, res): Promise<void> {
    const project = await this.projectModel
      .findOne(this.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const linearData = await this.getXmlReadyLinearDataFromProject(userId.toString(), project);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=files.zip');

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    const declaration = {
      declaration: {
        attributes: {
          version: '1.0',
          encoding: 'utf-8',
        },
      },
    };

    for (const [langCode, data] of Object.entries(linearData)) {
      const containerName = langCode;
      const { localesData, componentsData } = data as IStructuredProjectData;

      const xmlLocalesData = {
        ...declaration,
        elements: localesData,
      };

      const xmlLocalesString = js2xml(xmlLocalesData, { compact: false, ignoreComment: true, spaces: 2 });
      archive.append(xmlLocalesString, { name: `${containerName}.xml` });

      for (const [componentName, componentData] of Object.entries(componentsData)) {
        const xmlComponentData = {
          ...declaration,
          elements: componentData,
        };

        const xmlComponentsString = js2xml(xmlComponentData, { compact: false, ignoreComment: true, spaces: 2 });
        archive.append(xmlComponentsString, { name: `${containerName}/${componentName}.xml` });
      }
    }

    await archive.finalize();
  }

  async exportProjectToAppleStrings(projectId: string, formatSettings: ExportFormatSettings, userId: string, res): Promise<void> {
    const project = await this.projectModel
      .findOne(this.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const structuredData = await this.getStringsReadyArrayFromProject(userId, project);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=files.zip');

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    for (const [langCode, data] of Object.entries(structuredData)) {
      const containerName = langCode;
      const { localesData, componentsData } = data as {
        localesData: { key: string; value: string }[];
        componentsData: {
          [key: string]: { key: string; value: string }[];
        };
      };

      const result = localesData.map(({ key, value }) => `"${key}" = "${value}";`);

      archive.append(result.join('\n'), { name: `${containerName}.strings` });

      for (const [componentName, componentData] of Object.entries(componentsData)) {
        const txtComponentsString = componentData.map(({ key, value }) => `"${key}" = "${value}";`).join('\n');

        archive.append(txtComponentsString, { name: `${containerName}/${componentName}.strings` });
      }
    }

    await archive.finalize();
  }

  async addMultipleRawLanguages(data: AddRawLanguagesDto): Promise<IRawLanguage[]> {
    return await this.rawLanguageModel.insertMany(data);
  }

  async getAppLanguagesData(): Promise<ILanguage[]> {
    const result = await this.rawLanguageModel.find({});

    return result.map(({ id, code, label }) => ({ id, code, label }));
  }

  collectDocuments(
    data: Record<string, unknown>,
    parentId: string | null = null,
    results: IImportedDocument[] = [],
    pathCache = '#',
    namePathCache = '#',
  ): IImportedDocument[] {
    for (const [label, value] of Object.entries(data)) {
      const document: IImportedDocument = {
        label,
        value: typeof value === 'string' ? value : null,
        type: typeof value === 'string' ? 'string' : 'folder',
        parentId,
        id: undefined,
        pathCache,
        namePathCache,
      };

      const tempId = Math.random().toString(16).substring(2);
      document.id = tempId;
      results.push(document);

      if (typeof value === 'object' && value !== null) {
        this.collectDocuments(value as Record<string, unknown>, tempId, results, `${pathCache}/${tempId}`, `${namePathCache}/${label}`);
      }
    }

    return results;
  }

  async importDataToProject(data: IImportRequest, userId: string): Promise<IImportResult> {
    const { projectId, files, metaData } = data;

    const project = await this.projectModel
      .findOne(this.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    let filesMetaData: JsonImportFileMetaDataItem[];

    try {
      filesMetaData = JSON.parse(metaData) as JsonImportFileMetaDataItem[];
    } catch {
      throw new BadRequestException({
        error: 'Import Failed',
        message: 'Import metadata is invalid',
      });
    }

    if (!files?.length || filesMetaData.length !== files.length) {
      throw new BadRequestException({
        error: 'Import Failed',
        message: 'Files and metadata do not match',
      });
    }

    const filesMetaDataMap: JsonImportFileMetaDataMap = {};

    filesMetaData.forEach((dataItem: JsonImportFileMetaDataItem) => {
      filesMetaDataMap[dataItem.name] = dataItem;
    });

    const langCodes: string[] = [];

    for (let i = 0; i < filesMetaData.length; i += 1) {
      const { name, code } = filesMetaData[i];

      filesMetaDataMap[name] = filesMetaData[i];

      langCodes.push(code);
    }

    const languages = await this.rawLanguageModel.find({ code: { $in: langCodes } });

    const languagesMap: Record<string, IRawLanguage> = {};

    for (let i = 0; i < languages.length; i += 1) {
      languagesMap[languages[i].code] = languages[i];
    }

    const missingLanguageCode = langCodes.find((code) => !languagesMap[code]);

    if (missingLanguageCode) {
      throw new BadRequestException({
        error: 'Import Failed',
        message: `Language ${missingLanguageCode} is not supported`,
      });
    }

    const documentsToCreate: Record<string, IImportedDocument> = {};

    for (let j = 0; j < files.length; j += 1) {
      const { originalname, buffer } = files[j];
      const fileContent = buffer.toString('utf-8');

      let fileContentData: Record<string, unknown>;

      try {
        fileContentData = JSON.parse(fileContent);
      } catch {
        throw new BadRequestException({
          error: 'Import Failed',
          message: `File ${originalname} contains invalid JSON`,
        });
      }

      if (!filesMetaDataMap[originalname]) {
        throw new BadRequestException({
          error: 'Import Failed',
          message: `Metadata for file ${originalname} is missing`,
        });
      }

      const { code: languageCode } = filesMetaDataMap[originalname];

      const documentsData = this.collectDocuments(fileContentData, projectId);

      documentsData.forEach((document) => {
        const { id, label, type, parentId, value, pathCache, namePathCache } = document;

        const namePathCacheWithLabel = `${namePathCache}/${label}`;

        if (!documentsToCreate[namePathCacheWithLabel]) {
          documentsToCreate[namePathCacheWithLabel] = {
            id,
            userId,
            parentId,
            projectId,
            label,
            type,
            pathCache,
          };

          if (type === 'string') {
            documentsToCreate[namePathCacheWithLabel].values = [
              {
                code: languageCode,
                value,
              },
            ];
          }
        } else {
          if (type === 'string') {
            documentsToCreate[namePathCacheWithLabel].values.push({
              code: languageCode,
              value,
            });
          }
        }
      });
    }

    const valuesToCreate: Partial<IKeyValue>[] = [];

    const arrayOfDocumentsToCreate = Object.values(documentsToCreate);

    arrayOfDocumentsToCreate.forEach((document) => {
      const { id, type, parentId, values, pathCache } = document;

      if (type === 'string') {
        values.forEach(({ code, value }) => {
          valuesToCreate.push({
            id: Math.random().toString(16).substring(2),
            languageId: languagesMap[code].id,
            keyId: id,
            parentId,
            value,
            userId,
            projectId,
            pathCache,
          });
        });
      }
    });

    const { languages: projectLanguages } = project;

    const projectLanguagesIdsMap: Record<string, boolean> = {};

    for (let k = 0; k < projectLanguages.length; k += 1) {
      const { id } = projectLanguages[k] as IProjectLanguage;
      projectLanguagesIdsMap[id] = true;
    }

    const languagesToAdd = languages
      .map(({ id, label, code }) => ({
        projectId,
        id,
        label,
        baseLanguage: false,
        code,
        visible: true,
      }))
      .filter(({ id }) => {
        return !projectLanguagesIdsMap[id];
      });

    let addProjectLanguagesResult = {};

    if (languagesToAdd.length > 0) {
      addProjectLanguagesResult = await this.addMultipleProjectLanguages({
        projectId,
        languages: languagesToAdd,
      }, userId);
    }

    const createDocumentsResult = await this.keyModel.insertMany(arrayOfDocumentsToCreate);

    const createValuesResult = await this.keyValueModel.insertMany(valuesToCreate);

    return {
      addProjectLanguagesResult,
      createDocumentsResult,
      createValuesResult,
    };
  }

  async importComponentsDataToProject(data: IImportComponentsRequest, userId: string): Promise<IImportResult> {
    const { projectId, files, metaData } = data;

    const project = await this.projectModel
      .findOne(this.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!files?.length || metaData.length !== files.length) {
      throw new BadRequestException({
        error: 'Import Failed',
        message: 'Files and metadata do not match',
      });
    }

    const { languages: projectLanguages } = project;

    const projectLanguagesLanguagesSet = new Set(projectLanguages.map(({ id }: ILanguage) => id));
    const languageIdsToAdd = new Set<string>();

    const componentsToCreate = new Set<string>();

    metaData.forEach((dataItem) => {
      const { name, languageId } = dataItem;

      if (!projectLanguagesLanguagesSet.has(languageId)) {
        languageIdsToAdd.add(languageId);
      }

      componentsToCreate.add(name);
    });

    const languagesToAdd = await this.rawLanguageModel.find({ id: { $in: [...languageIdsToAdd] } });
    const languagesToAddMap = new Map(languagesToAdd.map((language) => [language.id, language]));
    const missingLanguageId = [...languageIdsToAdd].find((languageId) => !languagesToAddMap.has(languageId));

    if (missingLanguageId) {
      throw new BadRequestException({
        error: 'Import Failed',
        message: `Language ${missingLanguageId} is not supported`,
      });
    }

    let addProjectLanguagesResult: unknown | null = null;

    const documentsToCreate: Record<string, IImportedDocument> = {};

    for (let i = 0; i < files.length; i += 1) {
      const { buffer } = files[i];
      const fileMetaData = metaData[i];

      const fileContent = buffer.toString('utf-8');
      let fileContentData: Record<string, unknown>;

      try {
        fileContentData = JSON.parse(fileContent);
      } catch {
        throw new BadRequestException({
          error: 'Import Failed',
          message: `File ${fileMetaData?.name || i + 1} contains invalid JSON`,
        });
      }

      const { name: fileName, code: languageCode, languageId } = fileMetaData;

      const componentToCreateId = Math.random().toString(16).substring(2);

      const componentToCreateData: IImportedDocument = {
        label: fileName,
        parentId: projectId,
        projectId,
        type: 'component',
        userId,
        id: componentToCreateId,
        pathCache: '#',
      };

      const documentsData = this.collectDocuments(
        fileContentData,
        componentToCreateId,
        [],
        `#/${componentToCreateId}`,
        `#/${fileName}`,
      );

      documentsData.push(componentToCreateData);

      documentsData.forEach((document) => {
        const { id, label, type, parentId, value, pathCache, namePathCache } = document;

        const namePathCacheWithLabel = `${namePathCache}/${label}`;

        if (!documentsToCreate[namePathCacheWithLabel]) {
          documentsToCreate[namePathCacheWithLabel] = {
            id,
            userId,
            parentId,
            projectId,
            label,
            type,
            pathCache,
          };

          if (type === 'string') {
            documentsToCreate[namePathCacheWithLabel].values = [
              {
                code: languageCode,
                languageId,
                value,
              },
            ];
          }
        } else {
          if (type === 'string') {
            documentsToCreate[namePathCacheWithLabel].values.push({
              code: languageCode,
              languageId,
              value,
            });
          }
        }
      });
    }

    const valuesToCreate: Partial<IKeyValue>[] = [];

    const arrayOfDocumentsToCreate = Object.values(documentsToCreate);

    arrayOfDocumentsToCreate.forEach((document) => {
      const { id, type, parentId, values, pathCache } = document;

      if (type === 'string') {
        values.forEach(({ languageId, value }) => {
          valuesToCreate.push({
            id: Math.random().toString(16).substring(2),
            languageId,
            keyId: id,
            parentId,
            value,
            userId,
            projectId,
            pathCache,
          });
        });
      }
    });

    if (languagesToAdd.length > 0) {
      addProjectLanguagesResult = await this.addMultipleProjectLanguages({
        projectId,
        languages: languagesToAdd.map(({ id, label, code }) => ({
          projectId,
          id,
          label,
          baseLanguage: false,
          code,
          visible: true,
        })),
      }, userId);
    }

    const createDocumentsResult = await this.keyModel.insertMany(arrayOfDocumentsToCreate);

    const createValuesResult = await this.keyValueModel.insertMany(valuesToCreate);

    return {
      addProjectLanguagesResult,
      createDocumentsResult,
      createValuesResult,
    };
  }
}
