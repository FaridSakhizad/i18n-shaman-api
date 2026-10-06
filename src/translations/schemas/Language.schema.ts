import * as mongoose from 'mongoose';

export const LanguageSchema = new mongoose.Schema({
  id: String,
  label: String,
  code: String,
  baseLanguage: Boolean,
  visible: Boolean,
  customCodeEnabled: Boolean,
  customLabelEnabled: Boolean,
  customCode: String,
  customLabel: String,
}, { strict: true });
