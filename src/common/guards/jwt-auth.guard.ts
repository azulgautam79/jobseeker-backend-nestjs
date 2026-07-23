import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ClsService } from 'nestjs-cls';
import { CLS_KEYS } from '../cls/cls.constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly cls: ClsService,
  ) {
    super();
  }

  // canActivate(context: ExecutionContext) {
  //     return super.canActivate(context);
  // }

  handleRequest(err, user, info, context) {
    const authenticatedUser = super.handleRequest(err, user, info, context);

    this.cls.setIfUndefined(CLS_KEYS.USER_ID, authenticatedUser._id.toString());
    this.cls.setIfUndefined(CLS_KEYS.ROLE, authenticatedUser.role);

    return authenticatedUser;
  }
}
