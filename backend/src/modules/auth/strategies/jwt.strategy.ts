import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { user_type_enum } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import { JwtPayload } from '../auth.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: user_type_enum;
  isSuperAdmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => JwtStrategy.fromCookie(request),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  private static fromCookie(request: Request): string | null {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((cookie) => {
        const [name, ...value] = cookie.trim().split('=');
        return [name, decodeURIComponent(value.join('='))];
      }),
    );

    const path = (request.path ?? request.originalUrl ?? '').replace(/^\/api(?=\/)/, '');
    const preferredCookieNames = path.startsWith('/partner/')
      ? ['session_partner', 'session']
      : path.startsWith('/admin/')
        ? ['session_admin', 'session']
        : path.startsWith('/bookings') || path.startsWith('/mock-payment')
          ? ['session_customer', 'session']
          : [
            'session',
            'session_customer',
            'session_partner',
            'session_admin',
          ];

    for (const name of preferredCookieNames) {
      if (cookies[name]) {
        const val = cookies[name];
        if (val.startsWith('Bearer ')) {
          return val.substring(7);
        }
        return val;
      }
    }

    return null;
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      userType: payload.userType,
      isSuperAdmin: payload.isSuperAdmin,
    };
  }
}
