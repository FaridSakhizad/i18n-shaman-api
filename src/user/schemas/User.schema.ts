import * as mongoose from 'mongoose';

export const UserSettingsSchema = new mongoose.Schema({
  language: String,
});

export const UserPreferencesSchema = new mongoose.Schema({
  projectsOrder: {
    type: [String],
    default: [],
    validate: {
      validator: (projectsOrder: unknown[]) => projectsOrder.every((projectId) => (
        typeof projectId === 'string' && projectId.length > 0
      )),
      message: 'projectsOrder must contain only non-empty strings.',
    },
  },
});

export const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  createdAt: Date,
  verificationEpoch: Date,
  role: String,
  active: {
    type: Boolean,
    default: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  settings: UserSettingsSchema,
  preferences: UserPreferencesSchema,
});
