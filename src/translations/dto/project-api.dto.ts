import { IsArray, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { EExportFormats, ILanguage, IProjectLanguage, ITag } from '../interfaces/project.interface';
import { IKey } from '../interfaces/key.interface';
import { IKeyValue } from '../interfaces/keyValue.interface';

export class UpdateProjectDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsArray()
  languages?: IProjectLanguage[];
}

export class DeleteProjectDto {
  @IsString()
  projectId: string;
}

export class DeleteProjectLanguageDto {
  @IsString()
  projectId: string;

  @IsString()
  languageId: string;
}

export class ExportProjectQueryDto {
  @IsString()
  projectId: string;

  @IsEnum(EExportFormats)
  format: EExportFormats;

  @IsOptional()
  @IsObject()
  formatSettings?: Record<string, unknown>;
}

export interface IImportRequest {
  projectId: string;
  files: Express.Multer.File[];
  metaData: string;
}

export interface IImportComponentsMetaDataItem {
  name: string;
  code: string;
  languageId: string;
}

export interface IImportComponentsRequest {
  projectId: string;
  files: Express.Multer.File[];
  metaData: IImportComponentsMetaDataItem[];
}

export interface IImportResult {
  addProjectLanguagesResult: unknown | null;
  createDocumentsResult: unknown[];
  createValuesResult: unknown[];
}

export type AddRawLanguagesDto = ILanguage[];

export type ExportFormatSettings = Record<string, unknown>;

export interface IKeyDataResponse {
  key: IKey | null;
  values: Record<string, Record<string, IKeyValue>>;
}

export interface IEntityContentResponse {
  keys: IKey[];
  values: Record<string, Record<string, IKeyValue>>;
}

export interface IEntityMutationResponse {
  data: {
    root?: unknown;
    values?: unknown;
    children?: unknown;
  } | string;
}

export interface IKeyMutationResponse {
  key: IKey;
  values: Record<string, IKeyValue> | IKeyValue[];
}

export interface ITagListResponse {
  tags: ITag[];
}

export interface IEntitiesResponse {
  entities: IKey[];
}

export interface IOkResponse {
  ok: string;
}

export interface ISearchResponse {
  keys: IKey[];
  values: Record<string, Record<string, IKeyValue>>;
}

export type JsonImportFileMetaDataItem = {
  name: string;
  code: string;
};

export type JsonImportFileMetaDataMap = Record<string, JsonImportFileMetaDataItem>;

export type ImportedDocumentType = 'folder' | 'string' | 'component';

export interface IImportedDocument {
  id: string;
  label: string;
  type: ImportedDocumentType;
  parentId: string | null;
  pathCache: string;
  namePathCache?: string;
  value?: string | null;
  values?: Array<{
    code?: string;
    languageId?: string;
    value: string;
  }>;
  userId?: string;
  projectId?: string;
}
