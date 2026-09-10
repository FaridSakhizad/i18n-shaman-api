import { Document } from 'mongoose';
import { IKey } from './key.interface';

export interface ITag {
  id: string;
  name: string;
  color: string;
  customColor?: string | null;
}

export interface IProject extends Document {
  projectName: string;
  projectId: string;
  userId: string;
  status?: 'active' | 'deleted';
  deletedAt?: Date | null;
  deletedBy?: string | null;
  languages: IProjectLanguage[];
  tags: ITag[];
}

export interface IProjectData extends IProject {
  keys: IKey[];
  values?: any;
  keysTotalCount?: number;
  upstreamParents?: IKey[];
  subfolder?: IKey;
}

export interface ILanguage {
  id: string;
  label: string;
  code: string;
}

export interface IProjectLanguage extends ILanguage {
  baseLanguage: boolean;
  visible: boolean;
  customCodeEnabled: boolean;
  customLabelEnabled: boolean;
  customCode: string;
  customLabel: string;
}

export interface ILanguageMapItem {
  id: string;
  code: string;
  customCode: string;
  customCodeEnabled: boolean;
}

export interface ILanguageMap {
  [key: string]: ILanguageMapItem;
}

export enum EExportFormats {
  json = 'json',
  androidXml = 'android_xml',
  appleStrings = 'apple_string',
}

export interface IStructuredProjectData {
  [locale: string]: object;
}

export interface IStructuredProjectLinearLocaleData {
  [locale: string]: object[];
}

export enum EFilter {
  hideEmpty = 'hideEmpty',
  hidePartiallyPopulated = 'hidePartiallyPopulated',
  hideFullyPopulated = 'hideFullyPopulated',
  hideFolders = 'hideFolders',
  hideComponents = 'hideComponents',
  hideKeys = 'hideKeys',
}

export enum ESearchParams {
  caseSensitive = 'case_sensitive',
  exactMatch = 'exact_match',
  skipKeys = 'skip_keys',
  skipFolders = 'skip_folders',
  skipComponents = 'skip_components',
  skipValues = 'skip_values',
}

export interface ISearchParams {
  [ESearchParams.caseSensitive]: boolean;
  [ESearchParams.exactMatch]: boolean;
  [ESearchParams.skipKeys]: boolean;
  [ESearchParams.skipValues]: boolean;
  [ESearchParams.skipFolders]: boolean;
  [ESearchParams.skipComponents]: boolean;
}

export interface ICreateTag {
  projectId: string;
  tagName: string;
}

export interface IAddTagsToEntities {
  projectId: string;
  entityIds: string[];
  tagName: string;
  color: string;
}

export interface IAssignTagsToEntities {
  projectId: string;
  entityIds: string[];
  tagId: string;
}

export interface IDeleteTag {
  projectId: string;
  tagId: string;
}

export interface IEditTag extends ITag {
  projectId: string;
}
