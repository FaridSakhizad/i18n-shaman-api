import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  IImportComponentsRequest,
  IImportedDocument,
  IImportRequest,
  IImportResult,
  JsonImportFileMetaDataItem,
  JsonImportFileMetaDataMap,
} from './dto/project-api.dto';
import { IKey } from './interfaces/key.interface';
import { IKeyValue } from './interfaces/keyValue.interface';
import { ILanguage, IProject, IProjectLanguage } from './interfaces/project.interface';
import { IRawLanguage } from './interfaces/rawLanguage.interface';
import { LanguageService } from './language.service';
import { ProjectAccessService } from './project-access.service';

@Injectable()
export class ImportService {
  constructor(
    @Inject('KEY_MODEL')
    private readonly keyModel: Model<IKey>,
    @Inject('KEY_VALUE_MODEL')
    private readonly keyValueModel: Model<IKeyValue>,
    @Inject('RAW_LANGUAGE_MODEL')
    private readonly rawLanguageModel: Model<IRawLanguage>,
    private readonly languageService: LanguageService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async importDataToProject(data: IImportRequest, userId: string): Promise<IImportResult> {
    const { projectId, files, metaData } = data;

    const project = await this.projectAccessService.assertActiveProject(userId, projectId);

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
        const {
          id,
          label,
          type,
          parentId,
          value,
          pathCache,
          namePathCache,
        } = document;

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
        } else if (type === 'string') {
          documentsToCreate[namePathCacheWithLabel].values.push({
            code: languageCode,
            value,
          });
        }
      });
    }

    const valuesToCreate: Partial<IKeyValue>[] = [];
    const arrayOfDocumentsToCreate = Object.values(documentsToCreate);

    arrayOfDocumentsToCreate.forEach((document) => {
      const {
        id,
        type,
        parentId,
        values,
        pathCache,
      } = document;

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

    const languagesToAdd = this.getMissingProjectLanguages(project, languages)
      .map(({ id, label, code }) => ({
        projectId,
        id,
        label,
        baseLanguage: false,
        code,
        visible: true,
      }));

    let addProjectLanguagesResult = {};

    if (languagesToAdd.length > 0) {
      addProjectLanguagesResult = await this.languageService.addMultipleProjectLanguages({
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

    const project = await this.projectAccessService.assertActiveProject(userId, projectId);

    if (!files?.length || metaData.length !== files.length) {
      throw new BadRequestException({
        error: 'Import Failed',
        message: 'Files and metadata do not match',
      });
    }

    const { languages: projectLanguages } = project;

    const projectLanguagesLanguagesSet = new Set(projectLanguages.map(({ id }: ILanguage) => id));
    const languageIdsToAdd = new Set<string>();

    metaData.forEach((dataItem) => {
      const { languageId } = dataItem;

      if (!projectLanguagesLanguagesSet.has(languageId)) {
        languageIdsToAdd.add(languageId);
      }
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
        const {
          id,
          label,
          type,
          parentId,
          value,
          pathCache,
          namePathCache,
        } = document;

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
        } else if (type === 'string') {
          documentsToCreate[namePathCacheWithLabel].values.push({
            code: languageCode,
            languageId,
            value,
          });
        }
      });
    }

    const valuesToCreate: Partial<IKeyValue>[] = [];

    const arrayOfDocumentsToCreate = Object.values(documentsToCreate);

    arrayOfDocumentsToCreate.forEach((document) => {
      const {
        id,
        type,
        parentId,
        values,
        pathCache,
      } = document;

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
      addProjectLanguagesResult = await this.languageService.addMultipleProjectLanguages({
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

  private collectDocuments(
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

  private getMissingProjectLanguages(project: IProject, languages: IRawLanguage[]): IRawLanguage[] {
    const { languages: projectLanguages } = project;
    const projectLanguagesIdsMap: Record<string, boolean> = {};

    for (let k = 0; k < projectLanguages.length; k += 1) {
      const { id } = projectLanguages[k] as IProjectLanguage;
      projectLanguagesIdsMap[id] = true;
    }

    return languages.filter(({ id }) => !projectLanguagesIdsMap[id]);
  }
}
