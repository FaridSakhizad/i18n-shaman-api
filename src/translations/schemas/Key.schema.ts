import * as mongoose from 'mongoose';
import { KeyTagSchema } from './KeyTag.schema';
import { TagSchema } from './Tag.schema';

export const KeySchema = new mongoose.Schema({
  id: String,
  userId: String,
  projectId: String,
  parentId: String,
  label: String,
  description: String,
  type: String,
  pathCache: String,
  createdAt: Number,
  updatedAt: Number,
  tags: {
    type: [KeyTagSchema],
    default: []
  },
});
