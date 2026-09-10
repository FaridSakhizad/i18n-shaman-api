import * as mongoose from 'mongoose';
import { KeyTagSchema } from './KeyTag.schema';

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

KeySchema.index({ userId: 1, projectId: 1, parentId: 1, type: 1 });
KeySchema.index({ userId: 1, projectId: 1, id: 1 });
KeySchema.index({ userId: 1, projectId: 1, pathCache: 1 });
KeySchema.index({ userId: 1, projectId: 1, 'tags.id': 1 });
KeySchema.index({ userId: 1, projectId: 1, label: 1 });
