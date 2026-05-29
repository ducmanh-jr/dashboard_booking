import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import {
  business_type_enum,
  device_type_enum,
  social_provider_enum,
  User,
  UserSession,
  user_status_enum,
  user_type_enum,
  kyc_status_enum,
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
    isSuperAdmin?: boolean;
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
        isSuperAdmin: this.isSuperAdminEmail(user.email),
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

    if (user.userType === user_type_enum.partner) {
      const partner = await this.prisma.partnerProfile.findUnique({
        where: { userId: user.id },
      });
      if (partner) {
        if (partner.kycStatus === kyc_status_enum.pending) {
          throw new ForbiddenException('Tài khoản đối tác đang chờ quản trị viên phê duyệt.');
        }
        if (partner.kycStatus === kyc_status_enum.rejected) {
          throw new ForbiddenException('Tài khoản đối tác đã bị từ chối phê duyệt.');
        }
      }
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

    if (user.userType === user_type_enum.partner) {
      const partner = await this.prisma.partnerProfile.findUnique({
        where: { userId: user.id },
      });
      if (partner) {
        if (partner.kycStatus === kyc_status_enum.pending) {
          throw new ForbiddenException('Tài khoản đối tác đang chờ quản trị viên phê duyệt.');
        }
        if (partner.kycStatus === kyc_status_enum.rejected) {
          throw new ForbiddenException('Tài khoản đối tác đã bị từ chối phê duyệt.');
        }
      }
    }

    return this.excludePasswordHash(user);
  }

  // ---------------------------------------------------------------------------
  // Partner Apply (dành cho user đã login muốn trở thành đối tác)
  // ---------------------------------------------------------------------------

  async applyAsPartner(
    userId: string,
    data: { businessName: string; phone?: string },
  ): Promise<LoginResponse> {
    const parsedId = BigInt(userId);

    const user = await this.prisma.user.findUnique({ where: { id: parsedId } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');

    // Nâng cấp role thành partner + cập nhật phone nếu có
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const updateData: { userType: user_type_enum; phone?: string } = {
        userType: user_type_enum.partner,
      };
      if (data.phone && !user.phone) {
        updateData.phone = data.phone;
      }

      const updated = await tx.user.update({
        where: { id: parsedId },
        data: updateData,
      });

      // Tạo PartnerProfile nếu chưa có
      const existing = await tx.partnerProfile.findUnique({
        where: { userId: parsedId },
      });
      if (!existing) {
        await tx.partnerProfile.create({
          data: {
            userId: parsedId,
            businessName: data.businessName || user.fullName,
            businessType: business_type_enum.individual,
          },
        });
      }

      return updated;
    });

    // Sinh JWT mới với role partner
    const tokens = await this.generateTokens(updatedUser);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, this.saltRounds);

    await this.prisma.userSession.create({
      data: {
        userId: parsedId,
        tokenHash: refreshTokenHash,
        deviceType: device_type_enum.web,
        lastActiveAt: new Date(),
        expiresAt: this.getRefreshTokenExpiryDate(),
      },
    });

    return {
      ...tokens,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        role: updatedUser.userType,
        status: updatedUser.status,
        userType: updatedUser.userType,
        isSuperAdmin: this.isSuperAdminEmail(updatedUser.email),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Google OAuth (GIS)
  // ---------------------------------------------------------------------------

  async googleLogin(
    credential: string,
    loginContext: LoginContext = {},
  ): Promise<LoginResponse> {
    // 1. Verify token với Google tokeninfo endpoint
    const googleUser = await this.verifyGoogleCredential(credential);

    // 2. Xác định role theo admin whitelist
    const userType = await this.resolveGoogleRole(googleUser.email);

    // 3. Upsert User thông qua SocialAccount
    const user = await this.prisma.$transaction(async (tx) => {
      // Tìm SocialAccount hiện có
      const existingSocial = await tx.socialAccount.findUnique({
        where: {
          provider_providerId: {
            provider: social_provider_enum.google,
            providerId: googleUser.sub,
          },
        },
        include: { user: true },
      });

      let dbUser: User;

      if (existingSocial) {
        // Đã tồn tại → lấy user, cập nhật avatar nếu có
        dbUser = existingSocial.user;
        if (googleUser.picture && !dbUser.avatarUrl) {
          dbUser = await tx.user.update({
            where: { id: dbUser.id },
            data: { avatarUrl: googleUser.picture },
          });
        }
        // Cập nhật role nếu cần (ví dụ: nâng lên admin)
        if (userType === user_type_enum.admin && dbUser.userType !== user_type_enum.admin) {
          dbUser = await tx.user.update({
            where: { id: dbUser.id },
            data: { userType: user_type_enum.admin },
          });
        }
      } else {
        // Chưa có → kiểm tra xem email đã tồn tại chưa
        const existingUserByEmail = await tx.user.findFirst({
          where: { email: googleUser.email, deletedAt: null },
        });

        if (existingUserByEmail) {
          // Gắn SocialAccount vào user hiện có
          dbUser = existingUserByEmail;
          // Nâng role admin nếu cần
          if (userType === user_type_enum.admin && dbUser.userType !== user_type_enum.admin) {
            dbUser = await tx.user.update({
              where: { id: dbUser.id },
              data: { userType: user_type_enum.admin },
            });
          }
        } else {
          // Tạo user mới
          dbUser = await tx.user.create({
            data: {
              email: googleUser.email,
              fullName: googleUser.name,
              avatarUrl: googleUser.picture ?? null,
              userType,
              status: user_status_enum.active,
              emailVerifiedAt: new Date(),
            },
          });

          // Tạo CustomerProfile nếu là customer
          if (userType === user_type_enum.customer) {
            await tx.customerProfile.create({
              data: { userId: dbUser.id },
            });
          }
        }

        // Tạo SocialAccount
        await tx.socialAccount.create({
          data: {
            userId: dbUser.id,
            provider: social_provider_enum.google,
            providerId: googleUser.sub,
          },
        });
      }

      // Cập nhật lastLoginAt
      dbUser = await tx.user.update({
        where: { id: dbUser.id },
        data: { lastLoginAt: new Date() },
      });

      return dbUser;
    });

    if (user.userType === user_type_enum.partner) {
      const partner = await this.prisma.partnerProfile.findUnique({
        where: { userId: user.id },
      });
      if (partner) {
        if (partner.kycStatus === kyc_status_enum.pending) {
          throw new ForbiddenException('Tài khoản đối tác đang chờ quản trị viên phê duyệt.');
        }
        if (partner.kycStatus === kyc_status_enum.rejected) {
          throw new ForbiddenException('Tài khoản đối tác đã bị từ chối phê duyệt.');
        }
      }
    }

    // 4. Tạo session và sinh JWT
    const temporaryTokenHash = await bcrypt.hash(randomUUID(), this.saltRounds);
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: temporaryTokenHash,
        deviceType: device_type_enum.web,
        ipAddress: loginContext.ipAddress,
        userAgent: loginContext.userAgent,
        lastActiveAt: new Date(),
        expiresAt: this.getRefreshTokenExpiryDate(),
      },
    });

    const tokens = await this.generateTokens(user);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, this.saltRounds);

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { tokenHash: refreshTokenHash },
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
        isSuperAdmin: this.isSuperAdminEmail(user.email),
      },
    };
  }

  private async verifyGoogleCredential(credential: string): Promise<{
    sub: string;
    email: string;
    name: string;
    picture?: string;
  }> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      throw new UnauthorizedException('Google OAuth chưa được cấu hình. Vui lòng thêm GOOGLE_CLIENT_ID vào .env');
    }

    let payload: any;
    try {
      // Gọi Google tokeninfo để verify id_token
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google API status: ${response.status}`);
      }
      payload = await response.json();
    } catch {
      throw new UnauthorizedException('Không thể xác minh token Google');
    }

    // Kiểm tra token thuộc về đúng Client ID của hệ thống
    if (payload.aud !== clientId) {
      throw new UnauthorizedException('Google token không hợp lệ (sai audience)');
    }

    if (!payload.email_verified || payload.email_verified === 'false') {
      throw new UnauthorizedException('Email Google chưa được xác minh');
    }

    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Token Google thiếu thông tin cần thiết');
    }

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: (payload.name ?? payload.email.split('@')[0]) as string,
      picture: payload.picture as string | undefined,
    };
  }

  isSuperAdminEmail(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    const emails = (this.configService.get<string>('SUPER_ADMIN_EMAILS') ?? 'nguyenducmanh.ovaltine@gmail.com')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return emails.includes(normalized);
  }

  private async resolveGoogleRole(email: string): Promise<user_type_enum> {
    const normalized = email.trim().toLowerCase();
    const adminEmails = (this.configService.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.includes(normalized) || this.isSuperAdminEmail(normalized)) {
      return user_type_enum.admin;
    }
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        email: normalized,
        userType: user_type_enum.admin,
        status: user_status_enum.active,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existingAdmin) return user_type_enum.admin;

    return user_type_enum.customer;
  }
}

