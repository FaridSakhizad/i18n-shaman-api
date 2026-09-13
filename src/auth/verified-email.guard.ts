import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { IUser } from './interfaces/user.interface';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(
    @Inject('USER_MODEL')
    private userModel: Model<IUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;

    const user = await this.userModel.findOne({ _id: userId }).exec();

    if (!user || user.deleted || user.active === false) {
      throw new NotFoundException('User Not Found');
    }

    if (!user.verified) {
      throw new ForbiddenException('Email is not verified');
    }

    return true;
  }
}
