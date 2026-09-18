import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateKeyDto } from './dto/update-key.dto';
import { IKey } from './interfaces/key.interface';
import { IKeyValue } from './interfaces/keyValue.interface';
import { ProjectAccessService } from './project-access.service';
import { KeyValueService } from './key-value.service';

@Injectable()
export class EntityService {
  constructor(
    @Inject('KEY_MODEL')
    private readonly keyModel: Model<IKey>,
    @Inject('KEY_VALUE_MODEL')
    private readonly keyValueModel: Model<IKeyValue>,
    private readonly projectAccessService: ProjectAccessService,
    private readonly keyValueService: KeyValueService,
  ) {}

  async createProjectEntity(createEntityDto: CreateEntityDto, userId: string) {
    const { id, projectId } = createEntityDto;

    const createdAt = +new Date();

    const { values, ...keyData } = createEntityDto;

    await this.projectAccessService.assertActiveProject(userId, projectId);

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
    await this.projectAccessService.assertActiveProject(userId, projectId);

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

  async duplicateEntities(userId: string, projectId: string, entityIds: string[]) {
    await this.projectAccessService.assertActiveProject(userId, projectId);

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
      const {
        _id,
        parentId,
        keyId,
        pathCache,
        ...data
      } = keyValue;

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

  async moveEntities(userId: string, projectId: string, entityIds: string[], destinationEntityId: string) {
    await this.projectAccessService.assertActiveProject(userId, projectId);

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

  async updateProjectEntity(updateKeyDto: UpdateKeyDto, userId: string) {
    const {
      id,
      label,
      description,
      values,
      projectId,
      parentId,
    } = updateKeyDto;

    const project = await this.projectAccessService.assertActiveProject(userId, projectId);

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

    const aggregatedValues = await this.keyValueService.getAggregatedValues(
      userId,
      projectId,
      [parentId],
      undefined,
      this.projectAccessService.getProjectLanguageIds(project),
    );

    return {
      key,
      values: aggregatedValues.length > 0 && aggregatedValues[0][id] ? aggregatedValues[0][id] : [],
    };
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

  private generateLabelForCopy(label: string): string {
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

  private getMovedRootEntitiesPathCache(destinationDocument: { pathCache: string; id: string }) {
    return `${destinationDocument.pathCache}/${destinationDocument.id}`;
  }

  private getMovedChildPathCache(
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
}
