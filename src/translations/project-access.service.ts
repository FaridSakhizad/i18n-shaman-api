import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { IProject } from './interfaces/project.interface';

@Injectable()
export class ProjectAccessService {
  constructor(
    @Inject('PROJECT_MODEL')
    private readonly projectModel: Model<IProject>,
  ) {}

  getActiveProjectFilter(userId: string, projectId?: string) {
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

  getProjectLanguageIds(project: IProject): string[] {
    return (project.languages || []).map(({ id }) => id);
  }
}
