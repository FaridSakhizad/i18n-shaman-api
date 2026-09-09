import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const { session, sessionID } = request;

    if (!session || !sessionID || !session.userId || !session.userLoggedIn) {
      throw new UnauthorizedException('Authentication required');
    }

    return true;
  }
}
