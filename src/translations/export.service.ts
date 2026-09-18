import * as archiver from 'archiver';
import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { js2xml } from 'xml-js';
import { ExportFormatSettings } from './dto/project-api.dto';
import { IKey } from './interfaces/key.interface';
import { IProject, IStructuredProjectData } from './interfaces/project.interface';
import { KeyTreeService } from './key-tree.service';
import { ProjectAccessService } from './project-access.service';
import { KeyValueService } from './key-value.service';

@Injectable()
export class ExportService {
  constructor(
    @Inject('KEY_MODEL')
    private readonly keyModel: Model<IKey>,
    private readonly keyTreeService: KeyTreeService,
    private readonly projectAccessService: ProjectAccessService,
    private readonly keyValueService: KeyValueService,
  ) {}

  async exportProjectToJson(projectId: string, formatSettings: ExportFormatSettings, userId: string, res): Promise<void> {
    const project = await this.projectAccessService.assertActiveProject(userId, projectId);
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

  async exportProjectToAndroidXml(projectId: string, formatSettings: ExportFormatSettings, userId: string, res): Promise<void> {
    const project = await this.projectAccessService.assertActiveProject(userId, projectId);
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
    const project = await this.projectAccessService.assertActiveProject(userId, projectId);
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

  private async getStructuredObjectFromProject(userId: string, project: IProject): Promise<any> {
    const { languages, projectId } = project;
    const keys = await this.keyModel.find({ userId, projectId }).lean<IKey[]>();
    const [aggregatedValues] = (
      await this.keyValueService.getAggregatedValues(
        userId,
        projectId,
        null,
        null,
        this.projectAccessService.getProjectLanguageIds(project),
      )
    ) || [];

    const structuredProjectData: IStructuredProjectData = {};

    for (let i = 0; i < languages.length; i += 1) {
      const {
        id,
        code,
        customCode,
        customCodeEnabled,
      } = languages[i];

      const tree = this.keyTreeService.buildHierarchyForJsonExport(keys, aggregatedValues, projectId, id);
      const languageLabel = customCodeEnabled ? customCode : code;

      structuredProjectData[languageLabel] = tree;
    }

    return structuredProjectData;
  }

  private async getXmlReadyLinearDataFromProject(userId: string, project: IProject): Promise<any> {
    const { languages, projectId } = project;

    const keys = await this.keyModel.find({ userId, projectId }).lean<IKey[]>();
    const [aggregatedValues] = (
      await this.keyValueService.getAggregatedValues(
        userId,
        projectId,
        null,
        null,
        this.projectAccessService.getProjectLanguageIds(project),
      )
    ) || [];

    const structuredProjectData: IStructuredProjectData = {};

    for (let i = 0; i < languages.length; i += 1) {
      const {
        id,
        code,
        customCode,
        customCodeEnabled,
      } = languages[i];

      const array = this.keyTreeService.buildLinearArrayForXml(keys, aggregatedValues, projectId, id);
      const languageLabel = customCodeEnabled ? customCode : code;

      structuredProjectData[languageLabel] = array;
    }

    return structuredProjectData;
  }

  private async getStringsReadyArrayFromProject(userId: string, project: IProject): Promise<any> {
    const { languages, projectId } = project;

    const keys = await this.keyModel.find({ userId, projectId }).lean<IKey[]>();
    const [aggregatedValues] = (
      await this.keyValueService.getAggregatedValues(
        userId,
        projectId,
        null,
        null,
        this.projectAccessService.getProjectLanguageIds(project),
      )
    ) || [];

    const structuredProjectData: IStructuredProjectData = {};

    for (let i = 0; i < languages.length; i += 1) {
      const {
        id,
        code,
        customCode,
        customCodeEnabled,
      } = languages[i];

      const array = this.keyTreeService.buildLinearKeyValueArray(keys, aggregatedValues, projectId, id);
      const languageLabel = customCodeEnabled ? customCode : code;

      structuredProjectData[languageLabel] = array;
    }

    return structuredProjectData;
  }
}
