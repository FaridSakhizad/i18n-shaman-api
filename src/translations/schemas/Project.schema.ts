import * as mongoose from 'mongoose';
import { LanguageSchema } from './Language.schema';
import { KeySchema } from './Key.schema';
import { TagSchema } from './Tag.schema';

export const ProjectSchema = new mongoose.Schema({
  userId: String,
  projectName: String,
  projectId: String,
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active',
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: String,
    default: null,
  },
  keys: [KeySchema],
  languages: [LanguageSchema],
  tags: {
    type: [TagSchema],
    default: []
  },
});

ProjectSchema.index({ userId: 1, deletedAt: 1 });
ProjectSchema.index({ userId: 1, projectId: 1, deletedAt: 1 });
