import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '../dbModule/database.module';
import { Providers } from '../dbModule/providers';
import { VerifiedEmailGuard } from '../auth/verified-email.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [UserService, VerifiedEmailGuard, ...Providers],
})
export class UserModule {}
