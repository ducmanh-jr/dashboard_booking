import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import {
  business_type_enum,
  device_type_enum,
  User,
  UserSession,
  user_status_enum,
  user_type_enum,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  userType: user_type_enum;
}

export type SafeUser = Omit<User, 'passwordHash' | 'deletedAt'>;

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: bigint;
    email: string;
    fullName: string;
    phone: string | null;
    role: user_type_enum;
    status: user_status_enum;
    userType: user_type_enum;
  };
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface LogoutResponse {
  statusCode: 200;
  message: 'Logged out successfully';
  data: null;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<SafeUser> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: registerDto.email }, { phone: registerDto.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or phone already exists');
    }

    const passwordHash = await bcrypt.hash(
      registerDto.password,
      this.saltRounds,
    );

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: registerDto.email,
          phone: registerDto.phone,
          passwordHash,
          fullName: registerDto.fullName,
          userType: registerDto.userType,
          status: user_status_enum.active,
        },
      });

      if (registerDto.userType === user_type_enum.partner) {
        await tx.partnerProfile.create({
          data: {
            userId: createdUser.id,
            businessName: registerDto.businessName ?? registerDto.fullName,
            businessType:
              registerDto.businessType ?? business_type_enum.individual,
          },
        });
      }

      return createdUser;
    });

    return this.excludePasswordHash(user);
  }

  async login(
    loginDto: LoginDto,
    loginContext: LoginContext,
  ): Promise<LoginResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const temporaryTokenHash = await bcrypt.hash(randomUUID(), this.saltRounds);
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: temporaryTokenHash,
        deviceName: loginDto.deviceName,
        deviceType: loginDto.deviceType ?? device_type_enum.web,
        ipAddress: loginContext.ipAddress,
        userAgent: loginContext.userAgent,
        lastActiveAt: new Date(),
        expiresAt: this.getRefreshTokenExpiryDate(),
      },
    });

    const tokens = await this.generateTokens(user);
    const refreshTokenHash = await bcrypt.hash(
      tokens.refreshToken,
      this.saltRounds,
    );

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        tokenHash: refreshTokenHash,
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.userType,
        status: user.status,
        userType: user.userType,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        status: user_status_enum.active,
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<RefreshResponse> {
    const payload = await this.verifyRefreshToken(refreshTokenDto.refreshToken);
    const userId = BigInt(payload.sub);
    const now = new Date();
    const activeSessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
    });

    const matchingSession = await this.findMatchingSession(
      refreshTokenDto.refreshToken,
      activeSessions,
    );

    if (!matchingSession) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        status: user_status_enum.active,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    const refreshTokenHash = await bcrypt.hash(
      tokens.refreshToken,
      this.saltRounds,
    );

    await this.prisma.userSession.update({
      where: { id: matchingSession.id },
      data: {
        tokenHash: refreshTokenHash,
        lastActiveAt: now,
        expiresAt: this.getRefreshTokenExpiryDate(),
      },
    });

    return tokens;
  }

  async logout(userId: string, sessionId?: string): Promise<LogoutResponse> {
    const parsedUserId = this.parseTokenBigInt(userId);
    const parsedSessionId = sessionId
      ? this.parseTokenBigInt(sessionId)
      : undefined;
    const activeSession = await this.prisma.userSession.findFirst({
      where: {
        id: parsedSessionId,
        userId: parsedUserId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!activeSession) {
      throw new UnauthorizedException('Invalid active session');
    }

    if (parsedSessionId) {
      await this.prisma.userSession.update({
        where: { id: activeSession.id },
        data: {
          revokedAt: new Date(),
        },
      });
    } else {
      await this.prisma.userSession.updateMany({
        where: {
          userId: parsedUserId,
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return {
      statusCode: 200,
      message: 'Logged out successfully',
      data: null,
    };
  }

  private parseTokenBigInt(value: string): bigint {
    try {
      return BigInt(value);
    } catch {
      throw new UnauthorizedException('Invalid active session');
    }
  }

  private async generateTokens(user: User): Promise<RefreshResponse> {
    const payload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
      userType: user.userType,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, this.getAccessTokenOptions()),
      this.jwtService.signAsync(payload, this.getRefreshTokenOptions()),
    ]);

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async findMatchingSession(
    refreshToken: string,
    activeSessions: UserSession[],
  ): Promise<UserSession | null> {
    for (const session of activeSessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.tokenHash);

      if (isMatch) {
        return session;
      }
    }

    return null;
  }

  private getAccessTokenOptions(): JwtSignOptions {
    return {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.getJwtExpiresIn('JWT_ACCESS_EXPIRES_IN'),
    };
  }

  private getRefreshTokenOptions(): JwtSignOptions {
    return {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.getJwtExpiresIn('JWT_REFRESH_EXPIRES_IN'),
    };
  }

  private getRefreshTokenExpiryDate(): Date {
    const expiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );

    return new Date(Date.now() + this.parseDurationToMilliseconds(expiresIn));
  }

  private getJwtExpiresIn(configKey: string): JwtSignOptions['expiresIn'] {
    return this.configService.getOrThrow<string>(
      configKey,
    ) as JwtSignOptions['expiresIn'];
  }

  private parseDurationToMilliseconds(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());

    if (!match) {
      throw new Error(`Unsupported JWT duration: ${duration}`);
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }

  private excludePasswordHash(user: User): SafeUser {
    return {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      userType: user.userType,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserById(id: string | number | bigint): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
    });
    if (!user) return null;
    return this.excludePasswordHash(user);
  }
}

