import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { IKey } from './interfaces/key.interface';
import { IKeyValue } from './interfaces/keyValue.interface';
import { ISearchParams } from './interfaces/searchParams.interface';
import { KeyTreeService } from './key-tree.service';
import { ProjectAccessService } from './project-access.service';
import { KeyValueService } from './key-value.service';
import { escapeRegExp } from '../common/regex';

@Injectable()
export class SearchService {
  constructor(
    @Inject('KEY_MODEL')
    private keyModel: Model<IKey>,
    @Inject('KEY_VALUE_MODEL')
    private keyValueModel: Model<IKeyValue>,
    private readonly projectAccessService: ProjectAccessService,
    private readonly keyValueService: KeyValueService,
    private readonly keyTreeService: KeyTreeService,
  ) {}

  async performSearch(params: ISearchParams) {
    const {
      userId,
      projectId,
      searchQuery,
      exact,
      caseSensitive,
      inKeys,
      inValues,
      inFolders,
      inComponents,
    } = params;

    const project = await this.projectAccessService.assertActiveProject(userId, projectId);
    const languageIds = this.projectAccessService.getProjectLanguageIds(project);

    if (typeof searchQuery !== 'string' || searchQuery.length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const escapedSearchQuery = escapeRegExp(searchQuery);
    const searchParams: { $regex: string; $options?: string } = { $regex: escapedSearchQuery };

    if (!caseSensitive) {
      searchParams.$options = 'i';
    }

    if (exact) {
      searchParams.$regex = `^${escapedSearchQuery}$`;
      searchParams.$options = caseSensitive ? null : 'i';
    }

    const typesToSearch = [];

    if (inKeys) {
      typesToSearch.push('string');
    }

    if (inFolders) {
      typesToSearch.push('folder');
    }

    if (inComponents) {
      typesToSearch.push('component');
    }

    const keyMatchesByLabel = await this.keyModel.find({
      label: searchParams,
      userId,
      projectId,
      type: typesToSearch,
    });

    let valueMatchesByValue = [];

    if (inValues) {
      valueMatchesByValue = await this.keyValueModel.find({
        value: searchParams,
        userId,
        projectId,
        languageId: { $in: languageIds },
      });
    }

    let keysIds = [];

    for (let i = 0; i < keyMatchesByLabel.length; i++) {
      keysIds.push(keyMatchesByLabel[i].id);
    }

    if (inValues) {
      for (let i = 0; i < valueMatchesByValue.length; i++) {
        keysIds.push(valueMatchesByValue[i].keyId);
      }
    }

    keysIds = [...new Set(keysIds)];

    const allMatchedKeys = await this.keyModel
      .find({
        id: { $in: keysIds },
        userId,
        projectId,
      })
      .lean();

    const paths = allMatchedKeys.map(({ pathCache }) => pathCache);

    let allParentAndKeyIds = [];

    paths.forEach((path) => {
      const ids = path.replace('#/', '').split('/');

      allParentAndKeyIds = [...allParentAndKeyIds, ...ids];
    });

    allParentAndKeyIds = [...new Set([...allParentAndKeyIds, ...keysIds])];

    const allMatchesParents = await this.keyModel
      .find({
        id: { $in: allParentAndKeyIds },
        userId,
        projectId,
      })
      .lean();

    const tree = this.keyTreeService.buildHierarchy([...allMatchesParents], projectId);

    const [values] = await this.keyValueService.getAggregatedValues(
      userId,
      projectId,
      allMatchedKeys.map(({ parentId }) => parentId),
      keysIds,
      languageIds,
    );

    return {
      keys: tree,
      values,
    };
  }
}
