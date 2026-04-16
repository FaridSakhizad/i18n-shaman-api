import { Document } from 'mongoose';
import { IKeyValue } from './keyValue.interface';

export interface IKeyTag {
  id: string;
}

export interface IKey extends Document {
  userId: string;
  projectId: string;
  parentId: string;
  id: string;
  label: string;
  values: { [key: string]: IKeyValue };
  description: string;
  type: string;
  pathCache: string;
  createdAt: Date;
  tags: IKeyTag[];
}
