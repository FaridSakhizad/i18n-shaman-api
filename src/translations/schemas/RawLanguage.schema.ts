import * as mongoose from 'mongoose';

export const RawLanguageSchema = new mongoose.Schema({
  id: String,
  label: String,
  code: String,
});

RawLanguageSchema.index({ id: 1 });
RawLanguageSchema.index({ code: 1 });
