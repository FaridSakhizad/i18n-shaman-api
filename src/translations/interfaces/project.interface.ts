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
  keys: IKey[];
  values?: any;
  languages: [];
  keysTotalCount?: number;
  upstreamParents?: any;
  subfolder?: IKey;
  tags: ITag[];
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
  phpArray = 'php_array',
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
  userId: string;
  projectId: string;
  tagName: string;
}

export interface IAddTagsToEntities {
  userId: string;
  projectId: string;
  entityIds: string[];
  tagName: string;
  color: string;
}

export interface IAssignTagsToEntities {
  userId: string;
  projectId: string;
  entityIds: string[];
  tagId: string;
}

export interface IDeleteTag {
  userId: string;
  projectId: string;
  tagId: string;
}

export interface IEditTag extends ITag {
  userId: string;
  projectId: string;
}
