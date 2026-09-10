import * as mongoose from 'mongoose';

export const KeyValueSchema = new mongoose.Schema({
  id: String,
  userId: String,
  projectId: String,
  parentId: String,
  keyId: String,
  languageId: String,
  value: String,
  pathCache: String,
  createdAt: Number,
});

KeyValueSchema.index({ userId: 1, projectId: 1, keyId: 1 });
KeyValueSchema.index({ userId: 1, projectId: 1, parentId: 1 });
KeyValueSchema.index({ userId: 1, projectId: 1, languageId: 1 });
KeyValueSchema.index({ userId: 1, projectId: 1, pathCache: 1 });
KeyValueSchema.index({ userId: 1, projectId: 1, value: 1 });
