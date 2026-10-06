import * as mongoose from 'mongoose';
import { getApiConfig } from '../config/env';
import getLanguages from '../translations/raw-languages.fixture';
import { RawLanguageSchema } from '../translations/schemas/RawLanguage.schema';

async function seedRawLanguages() {
  const config = getApiConfig();
  const connection = await mongoose.connect(config.MONGO_URI);
  const rawLanguageModel = connection.model('Language', RawLanguageSchema);
  const languages = getLanguages().map(({ id, code, label }) => ({ id, code, label }));

  const result = await rawLanguageModel.bulkWrite(
    languages.map((language) => ({
      updateOne: {
        filter: { code: language.code },
        update: { $set: language },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  console.log(
    [
      `raw languages seed completed`,
      `matched=${result.matchedCount}`,
      `modified=${result.modifiedCount}`,
      `upserted=${result.upsertedCount}`,
      `total=${languages.length}`,
    ].join(' '),
  );

  await connection.disconnect();
}

seedRawLanguages().catch(async (error) => {
  console.error('raw languages seed failed', error);
  await mongoose.disconnect();
  process.exit(1);
});

