import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 *! Custom decorator to extract user information from the request object
 */
//
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
