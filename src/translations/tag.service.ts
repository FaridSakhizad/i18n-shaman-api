import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  IAddTagsToEntities,
  IAssignTagsToEntities,
  ICreateTag,
  IDeleteTag,
  IEditTag,
  IProject,
  ITag,
} from './interfaces/project.interface';
import { IKey } from './interfaces/key.interface';
import { ProjectAccessService } from './project-access.service';

@Injectable()
export class TagService {
  constructor(
    @Inject('PROJECT_MODEL')
    private readonly projectModel: Model<IProject>,
    @Inject('KEY_MODEL')
    private readonly keyModel: Model<IKey>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async createTag(data: ICreateTag, userId: string) {
    const { projectId, tagName } = data;

    const project = await this.projectModel
      .findOne(this.projectAccessService.getActiveProjectFilter(userId, projectId))
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.tags) {
      project.tags = [];
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
    const {
      projectId,
      entityIds,
      tagName,
      color,
    } = data;

    const project = await this.projectModel
      .findOne(this.projectAccessService.getActiveProjectFilter(userId, projectId))
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
      ...this.projectAccessService.getActiveProjectFilter(userId, projectId),
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
      ...this.projectAccessService.getActiveProjectFilter(userId, projectId),
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
      .findOne(this.projectAccessService.getActiveProjectFilter(userId, projectId))
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
      ...this.projectAccessService.getActiveProjectFilter(userId, projectId),
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

  private assertAllEntitiesFound(entities: IKey[], entityIds: string[]): void {
    const foundIds = new Set(entities.map(({ id }) => id));
    const hasMissingEntities = entityIds.some((id) => !foundIds.has(id));

    if (hasMissingEntities) {
      throw new NotFoundException('Entity not found');
    }
  }
}
