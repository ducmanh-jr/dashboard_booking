import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '@prisma/client';
import { Request } from 'express';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

type RoleRequestUser = Pick<User, 'userType'> & {
  user_type?: string;
};

type RoleRequest = Request & {
  user?: RoleRequestUser;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RoleRequest>();
    const userType = request.user?.user_type ?? request.user?.userType;

    if (!userType) {
      throw new ForbiddenException('User role is missing');
    }

    const isAllowed = requiredRoles.includes(userType as Role);

    if (!isAllowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
