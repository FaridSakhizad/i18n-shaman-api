import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { CreateProjectDto } from './dto/create-project.dto';
import { IProject } from './interfaces/project.interface';
import { UpdateProjectDto } from './dto/project-api.dto';
import { ProjectAccessService } from './project-access.service';

@Injectable()
export class ProjectService {
  constructor(
    @Inject('PROJECT_MODEL')
    private readonly projectModel: Model<IProject>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async getUserProjects(userId: string): Promise<IProject[]> {
    return this.projectModel.find(this.projectAccessService.getActiveProjectFilter(userId)).exec();
  }

  async createProject(createProjectDto: CreateProjectDto, userId: string): Promise<IProject[]> {
    const createdProject = new this.projectModel({
      ...createProjectDto,
      userId,
    });

    await createdProject.save();

    return this.getUserProjects(userId);
  }

  async updateProject(data: UpdateProjectDto & { userId?: string }, userId: string): Promise<IProject> {
    const { projectId, userId: _ignoredUserId, ...dataPatch } = data;

    const project = await this.projectModel.findOneAndUpdate(
      this.projectAccessService.getActiveProjectFilter(userId, projectId),
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
      this.projectAccessService.getActiveProjectFilter(userId, projectId),
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

    return this.getUserProjects(userId);
  }
}
