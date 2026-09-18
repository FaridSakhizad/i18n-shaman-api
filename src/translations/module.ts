import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TranslationsController } from './translations.controller';
import { SearchController } from './search.controller';
import { ProjectReadService } from './project-read.service';
import { SearchService } from './search.service';
import { KeyTreeService } from './key-tree.service';
import { ProjectAccessService } from './project-access.service';
import { ProjectService } from './project.service';
import { TagService } from './tag.service';
import { LanguageService } from './language.service';
import { KeyValueService } from './key-value.service';
import { EntityService } from './entity.service';
import { EntityQueryService } from './entity-query.service';
import { ExportService } from './export.service';
import { ImportService } from './import.service';
import { Providers } from '../database/providers';
import { VerifiedEmailGuard } from '../auth/verified-email.guard';
import { RateLimitGuard } from '../common/rate-limit.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [TranslationsController, SearchController],
  providers: [ProjectReadService, SearchService, KeyTreeService, ProjectAccessService, ProjectService, TagService, LanguageService, KeyValueService, EntityService, EntityQueryService, ExportService, ImportService, VerifiedEmailGuard, RateLimitGuard, ...Providers],
})
export class TranslationsModule {}
