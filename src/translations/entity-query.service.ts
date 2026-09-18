import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { IKey } from './interfaces/key.interface';
import { ProjectAccessService } from './project-access.service';
import { KeyValueService } from './key-value.service';

@Injectable()
export class EntityQueryService {
  constructor(
    @Inject('KEY_MODEL')
    private readonly keyModel: Model<IKey>,
    private readonly projectAccessService: ProjectAccessService,
    private readonly keyValueService: KeyValueService,
  ) {}

  async getKeyData(projectId: string, userId: string, keyId: string) {
    const project = await this.projectAccessService.assertActiveProject(userId, projectId);

    const result = await this.keyModel.findOne({
      projectId,
      userId,
      id: keyId,
    });

    const aggregatedValues = await this.keyValueService.getAggregatedValues(
      userId,
      projectId,
      null,
      [keyId],
      this.projectAccessService.getProjectLanguageIds(project),
    );

    return {
      key: result,
      values: aggregatedValues[0],
    };
  }

  async getEntityContent(projectId: string, userId: string, componentId: string) {
    const project = await this.projectAccessService.assertActiveProject(userId, projectId);

    const keys = await this.keyModel
      .find({
        projectId,
        userId,
        parentId: componentId,
      })
      .sort({ type: 'asc', label: 'asc' });

    const aggregatedValues = await this.keyValueService.getAggregatedValues(
      userId,
      projectId,
      [componentId],
      undefined,
      this.projectAccessService.getProjectLanguageIds(project),
    );

    return {
      keys,
      values: aggregatedValues[0],
    };
  }

  async getEntitiesChildrenByIds(projectId: string, userId: string, entityIds: string[]) {
    await this.projectAccessService.assertActiveProject(userId, projectId);

    return this.keyModel.find({
      projectId,
      userId,
      parentId: entityIds,
    });
  }

  async getMultipleEntitiesDataByParentId(projectId: string, parentId: string, userId: string): Promise<IKey[]> {
    await this.projectAccessService.assertActiveProject(userId, projectId);

    return this.keyModel.find({ projectId, parentId, userId });
  }
}
