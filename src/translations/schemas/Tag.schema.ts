import * as mongoose from 'mongoose';

export const TagSchema = new mongoose.Schema({
  id: String,
  name: String,
  color: String,
  customColor: String
});
