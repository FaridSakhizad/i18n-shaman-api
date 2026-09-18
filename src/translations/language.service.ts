import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { AddLanguageDto } from './dto/add-language.dto';
import { AddMultipleLanguagesDto } from './dto/add-multiple-languages.dto';
import { LanguageVisibilityDto } from './dto/language-visibility.dto';
import { MultipleLanguageVisibilityDto } from './dto/multiple-languages-visibility.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { AddRawLanguagesDto } from './dto/project-api.dto';
import { ILanguage, IProject } from './interfaces/project.interface';
import { IRawLanguage } from './interfaces/rawLanguage.interface';
import { ProjectAccessService } from './project-access.service';

@Injectable()
export class LanguageService {
  constructor(
    @Inject('PROJECT_MODEL')
    private readonly projectModel: Model<IProject>,
    @Inject('RAW_LANGUAGE_MODEL')
    private readonly rawLanguageModel: Model<IRawLanguage>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async addLanguage(addLanguageDto: AddLanguageDto, userId: string) {
    const {
      projectId,
      id,
      label,
      baseLanguage,
      code,
    } = addLanguageDto;

    await this.projectAccessService.assertActiveProject(userId, projectId);

    return this.projectModel.updateOne(
      this.projectAccessService.getActiveProjectFilter(userId, projectId),
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
  }

  async updateLanguage(updateLanguageDto: UpdateLanguageDto, userId: string): Promise<IProject> {
    const { projectId, ...language } = updateLanguageDto;

    const result = await this.projectModel.findOneAndUpdate(
      { ...this.projectAccessService.getActiveProjectFilter(userId, projectId), 'languages.id': language.id },
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
      .findOneAndUpdate(
        this.projectAccessService.getActiveProjectFilter(userId, projectId),
        { $push: { languages: { $each: languages } } },
        { new: true },
      )
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
          ...this.projectAccessService.getActiveProjectFilter(userId, projectId),
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
    await this.projectAccessService.assertActiveProject(userId, projectId);

    return this.projectModel.findOneAndUpdate(
      { ...this.projectAccessService.getActiveProjectFilter(userId, projectId), 'languages.id': languageId },
      { $set: { 'languages.$.visible': visible } },
      { new: true },
    );
  }

  async setMultipleLanguagesVisibility({ projectId, data }: MultipleLanguageVisibilityDto, userId: string): Promise<IProject> {
    await this.projectAccessService.assertActiveProject(userId, projectId);

    const bulkOps = data.map(({ languageId, visible }) => {
      return {
        updateOne: {
          filter: { ...this.projectAccessService.getActiveProjectFilter(userId, projectId), 'languages.id': languageId },
          update: { $set: { 'languages.$.visible': visible } },
        },
      };
    });

    await this.projectModel.bulkWrite(bulkOps);

    return this.projectModel.findOne(this.projectAccessService.getActiveProjectFilter(userId, projectId));
  }

  async addMultipleRawLanguages(data: AddRawLanguagesDto): Promise<IRawLanguage[]> {
    return this.rawLanguageModel.insertMany(data);
  }

  async getAppLanguagesData(): Promise<ILanguage[]> {
    const result = await this.rawLanguageModel.find({});

    return result.map(({ id, code, label }) => ({ id, code, label }));
  }
}
