import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import type { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';

type CurrentUserRequest = Request & {
  user?: AuthenticatedUser;
};

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    context: ExecutionContext,
  ):
    | AuthenticatedUser
    | AuthenticatedUser[keyof AuthenticatedUser]
    | undefined => {
    const request = context.switchToHttp().getRequest<CurrentUserRequest>();
    const user = request.user;

    return data && user ? user[data] : user;
  },
);
