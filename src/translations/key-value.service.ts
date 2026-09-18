import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { IKeyValue } from './interfaces/keyValue.interface';

@Injectable()
export class KeyValueService {
  constructor(
    @Inject('KEY_VALUE_MODEL')
    private readonly keyValueModel: Model<IKeyValue>,
  ) {}

  async getAggregatedValues(userId: string, projectId: string, parentIds: string[], keyIds?: string[], languageIds?: string[]) {
    return this.keyValueModel.aggregate([
      {
        $match: {
          userId,
          projectId,
          ...(parentIds ? { parentId: { $in: parentIds } } : {}),
          ...(keyIds ? { keyId: { $in: keyIds } } : {}),
          ...(languageIds ? { languageId: { $in: languageIds } } : {}),
        },
      },
      {
        $group: {
          _id: '$keyId',
          items: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          parentId: '$_id',
          items: 1,
        },
      },
      {
        $project: {
          parentId: 1,
          items: {
            $arrayToObject: {
              $map: {
                input: '$items',
                as: 'item',
                in: ['$$item.languageId', '$$item'],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          result: { $push: { k: '$parentId', v: '$items' } },
        },
      },
      {
        $project: {
          result: { $arrayToObject: '$result' },
        },
      },
      {
        $replaceRoot: { newRoot: '$result' },
      },
    ]);
  }
}
