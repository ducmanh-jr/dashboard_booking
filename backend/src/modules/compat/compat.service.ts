import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  booking_status_enum,
  kyc_status_enum,
  payment_status_enum,
  Prisma,
  property_status_enum,
  property_type_enum,
  user_status_enum,
  user_type_enum,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

type AnyBody = Record<string, unknown>;
type NotificationRow = {
  id: bigint;
  type: string;
  channel: string;
  title: string;
  body: string | null;
  data: unknown;
  entityType: string | null;
  entityId: bigint | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
};
type NotificationInput = {
  userId: bigint;
  type: string;
  channel?: string;
  title: string;
  body?: string | null;
  data?: unknown;
  entityType?: string | null;
  entityId?: bigint | null;
};
type CompatBooking = Prisma.BookingGetPayload<Record<string, never>> & {
  customer?: Prisma.UserGetPayload<Record<string, never>>;
  property?: Prisma.PropertyGetPayload<Record<string, never>>;
  roomType?: Prisma.RoomTypeGetPayload<Record<string, never>>;
};
type CompatProperty = Prisma.PropertyGetPayload<{ include: ReturnType<CompatService['propertyInclude']> }>;
type LegacyPropertyPayload = Record<string, unknown>;
type LegacyNearbyPayload = Record<string, unknown>;
type LegacyRowsByPropertyId = Map<string, { property?: LegacyPropertyPayload; nearby: LegacyNearbyPayload[] }>;

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';

@Injectable()
export class CompatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  async accountOverview(user: AuthenticatedUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: BigInt(user.id) },
      include: {
        socialAccounts: true,
        partnerProfile: {
          include: {
            properties: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 3,
            },
          },
        },
      },
    });
    if (!dbUser) throw new NotFoundException('Khong tim thay tai khoan');

    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId: dbUser.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: [{ lastActiveAt: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });

    const primaryProperty = dbUser.partnerProfile?.properties[0] ?? null;
    const isPartner = dbUser.userType === user_type_enum.partner;
    const isAdmin = dbUser.userType === user_type_enum.admin;
    const isSuperAdmin = dbUser.isSuperAdmin;

    return {
      profile: {
        id: Number(dbUser.id),
        email: dbUser.email,
        fullName: dbUser.fullName,
        phone: dbUser.phone,
        avatarUrl: dbUser.avatarUrl,
        role: dbUser.userType,
        title: isSuperAdmin ? 'Admin tổng' : isAdmin ? 'Quản trị viên' : 'Đối tác',
        isSuperAdmin,
        status: dbUser.status,
        preferredLanguage: dbUser.preferredLanguage?.trim() || 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        emailVerifiedAt: dbUser.emailVerifiedAt,
        lastLoginAt: dbUser.lastLoginAt,
        createdAt: dbUser.createdAt,
      },
      security: {
        googleLinked: dbUser.socialAccounts.some((item) => item.provider === 'google'),
        twoFactorEnabled: false,
        sessions: sessions.map((session) => ({
          id: Number(session.id),
          deviceName: session.deviceName || this.describeDevice(session.userAgent),
          deviceType: session.deviceType,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          lastActiveAt: session.lastActiveAt || session.createdAt,
          expiresAt: session.expiresAt,
        })),
      },
      business: isPartner && dbUser.partnerProfile ? {
        businessName: dbUser.partnerProfile.businessName,
        businessType: dbUser.partnerProfile.businessType,
        kycStatus: dbUser.partnerProfile.kycStatus,
        taxCode: dbUser.partnerProfile.taxCode,
        bankAccountName: dbUser.partnerProfile.bankAccountName,
        bankAccountNumber: dbUser.partnerProfile.bankAccountNumber,
        bankName: dbUser.partnerProfile.bankName,
        commissionTier: dbUser.partnerProfile.commissionTier,
        hotelName: primaryProperty?.name ?? dbUser.partnerProfile.businessName,
        address: primaryProperty?.address ?? null,
        city: primaryProperty?.city ?? null,
        hotelEmail: dbUser.email,
        hotline: dbUser.phone,
        propertyCount: dbUser.partnerProfile.properties.length,
      } : null,
      permissions: this.accountPermissions(isAdmin, isPartner),
      notifications: [
        { key: 'newBooking', label: 'Nhận thông báo khi có khách đặt phòng mới', enabled: true },
        { key: 'cancelBooking', label: 'Nhận thông báo khi khách hủy phòng', enabled: true },
        { key: 'monthlyReport', label: 'Nhận báo cáo doanh thu hàng tháng', enabled: isPartner },
      ],
    };
  }

  getAvatarUploadUrl(user: AuthenticatedUser) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME') ?? '';
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY') ?? '';
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET') ?? '';
    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException('Cloudinary chua duoc cau hinh');
    }

    const folder = `nowayhome/avatars/${user.userType}`;
    const timestamp = Math.floor(Date.now() / 1000);
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);

    return { signature, timestamp, cloudName, apiKey, folder };
  }

  async updateAccountAvatar(user: AuthenticatedUser, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file ảnh đại diện');

    const avatarUrl = `/api/uploads/avatars/${file.filename}`;
    const currentUser = await this.prisma.user.findUnique({
      where: { id: BigInt(user.id) },
      select: { avatarUrl: true },
    });
    if (!currentUser) {
      await this.deleteLocalAvatar(avatarUrl);
      throw new NotFoundException('Khong tim thay tai khoan');
    }

    let updated;
    try {
      updated = await this.prisma.user.update({
        where: { id: BigInt(user.id) },
        data: { avatarUrl },
      });
    } catch (error) {
      await this.deleteLocalAvatar(avatarUrl);
      throw error;
    }

    await this.deletePreviousAvatar(currentUser.avatarUrl, avatarUrl);

    return {
      avatarUrl: updated.avatarUrl,
      user: {
        id: Number(updated.id),
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
        role: updated.userType,
        title: updated.isSuperAdmin ? 'Admin tổng' : updated.userType === user_type_enum.admin ? 'Quản trị viên' : 'Đối tác',
        isSuperAdmin: updated.isSuperAdmin,
        status: updated.status,
      },
    };
  }

  async updateAccountProfile(user: AuthenticatedUser, body: AnyBody) {
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
    const preferredLanguage = typeof body.preferredLanguage === 'string'
      ? body.preferredLanguage.trim().slice(0, 5)
      : undefined;
    const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : undefined;

    if (!fullName) throw new BadRequestException('Ho ten khong duoc de trong');

    if (phone) {
      const duplicatedPhone = await this.prisma.user.findFirst({
        where: {
          phone,
          id: { not: BigInt(user.id) },
          deletedAt: null,
        },
      });
      if (duplicatedPhone) throw new ConflictException('So dien thoai da duoc su dung');
    }

    const updated = await this.prisma.user.update({
      where: { id: BigInt(user.id) },
      data: {
        fullName,
        phone: phone || null,
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
        ...(preferredLanguage ? { preferredLanguage } : {}),
      },
    });

    return {
      user: {
        id: Number(updated.id),
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
        role: updated.userType,
        title: updated.isSuperAdmin ? 'Admin tổng' : 'Quản trị viên',
        isSuperAdmin: updated.isSuperAdmin,
        status: updated.status,
      },
    };
  }

  async searchRooms(query: Record<string, string>) {
    const where: Prisma.PropertyWhereInput = {
      status: property_status_enum.active,
      deletedAt: null,
    };
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };

    const properties = await this.prisma.property.findMany({
      where,
      include: this.propertyInclude(),
      orderBy: { createdAt: 'desc' },
    });
    const rooms = await this.mapRooms(properties);
    return { hotels: rooms, rooms };
  }

  async roomDetail(slugOrId: string) {
    const property = await this.prisma.property.findFirst({
      where: /^\d+$/.test(slugOrId)
        ? {
          id: this.parseId(slugOrId, 'Ma khach san khong hop le'),
          deletedAt: null,
          status: { in: [property_status_enum.active, property_status_enum.suspended] },
        }
        : {
          slug: slugOrId,
          deletedAt: null,
          status: { in: [property_status_enum.active, property_status_enum.suspended] },
        },
      include: this.propertyInclude(),
    });
    if (!property) throw new NotFoundException('Khong tim thay khach san');
    const room = await this.mapOneRoom(property);
    return { hotel: room, room };
  }

  async partnerRooms(user: AuthenticatedUser) {
    const partner = await this.partnerProfile(user);
    const properties = await this.prisma.property.findMany({
      where: { partnerId: partner.id },
      include: this.propertyInclude(),
      orderBy: { createdAt: 'desc' },
    });
    const rooms = await this.mapRooms(properties);
    return { hotels: rooms, rooms };
  }

  async partnerRoom(user: AuthenticatedUser, id: string) {
    const partner = await this.partnerProfile(user);
    const property = await this.prisma.property.findFirst({
      where: { id: this.parseId(id, 'Ma khach san khong hop le'), partnerId: partner.id },
      include: this.propertyInclude(),
    });
    if (!property) throw new NotFoundException('Khong tim thay phong');
    const room = await this.mapOneRoom(property);
    return { hotel: room, room };
  }

  async createPartnerRoom(user: AuthenticatedUser, body: AnyBody) {
    const partner = await this.partnerProfile(user);
    const payload = this.normalizeRoomPayload(body);
    const slug = await this.uniqueSlug(payload.name);

    const created = await this.prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          partnerId: partner.id,
          slug,
          name: payload.name,
          propertyType: payload.propertyType,
          description: payload.description,
          address: payload.address,
          city: payload.city,
          latitude: payload.latitude,
          longitude: payload.longitude,
          starRating: payload.starRating,
          status: property_status_enum.pending_review,
        },
      });
      await this.upsertRoomTypes(tx, property.id, payload, user.id);
      await this.upsertPolicy(tx, property.id, body);
      await this.saveLegacyData(tx, property.id, body, user.id);
      await this.notifyAdmins(tx, {
        type: 'property_review',
        title: `Khach san cho duyet: ${payload.name}`,
        body: `${partner.businessName} da gui khach san can duyet.`,
        entityType: 'property',
        entityId: property.id,
        data: { propertyId: Number(property.id), partnerId: Number(partner.id) },
      });
      return property;
    });

    return {
      id: created.id,
      message: 'Da gui yeu cau tao khach san, vui long cho duyet',
    };
  }

  async updatePartnerRoom(user: AuthenticatedUser, id: string, body: AnyBody) {
    const partner = await this.partnerProfile(user);
    const propertyId = this.parseId(id, 'Ma khach san khong hop le');
    await this.ensurePartnerOwnsProperty(partner.id, propertyId);
    await this.ensurePropertyCanBeChanged(propertyId);
    await this.updateRoomData(propertyId, body, property_status_enum.pending_review, user);
    await this.notifyAdmins(this.prisma, {
      type: 'property_update_request',
      title: 'Yeu cau cap nhat khach san',
      body: `${partner.businessName} da gui thay doi khach san can duyet.`,
      entityType: 'property',
      entityId: propertyId,
      data: { propertyId: Number(propertyId), partnerId: Number(partner.id) },
    });
    return { ok: true, message: 'Da cap nhat thong tin khach san' };
  }

  async deletePartnerRoom(user: AuthenticatedUser, id: string) {
    const partner = await this.partnerProfile(user);
    const propertyId = this.parseId(id, 'Ma khach san khong hop le');
    await this.ensurePartnerOwnsProperty(partner.id, propertyId);
    await this.prisma.property.update({
      where: { id: propertyId },
      data: { status: property_status_enum.suspended },
    });
    return { ok: true };
  }

  async requestRestorePartnerRoom(user: AuthenticatedUser, id: string) {
    const partner = await this.partnerProfile(user);
    const propertyId = this.parseId(id, 'Ma khach san khong hop le');
    await this.ensurePartnerOwnsProperty(partner.id, propertyId);
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { status: true, deletedAt: true },
    });
    if (!property || !this.isArchivedProperty(property)) {
      throw new BadRequestException('Chi khach san da ngung hoat dong moi co the gui yeu cau khoi phuc');
    }

    await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        status: property_status_enum.pending_review,
        deletedAt: null,
        reviewedAt: null,
        reviewerId: null,
      },
    });
    await this.notifyAdmins(this.prisma, {
      type: 'property_restore_request',
      title: 'Yeu cau khoi phuc khach san',
      body: `${partner.businessName} da gui yeu cau khoi phuc khach san.`,
      entityType: 'property',
      entityId: propertyId,
      data: { propertyId: Number(propertyId), partnerId: Number(partner.id) },
    });
    return { ok: true, message: 'Da gui yeu cau khoi phuc khach san cho admin duyet' };
  }

  async adminRooms(status: string) {
    const where: Prisma.PropertyWhereInput = {};
    if (status === 'pending') Object.assign(where, { deletedAt: null, status: property_status_enum.pending_review });
    if (status === 'approved') Object.assign(where, { deletedAt: null, status: property_status_enum.active });
    if (status === 'rejected') Object.assign(where, { deletedAt: null, status: property_status_enum.rejected });
    if (status === 'archived' || status === 'suspended') {
      where.OR = [{ status: property_status_enum.suspended }, { deletedAt: { not: null } }];
    }
    const properties = await this.prisma.property.findMany({
      where,
      include: this.propertyInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return { rooms: await this.mapRooms(properties) };
  }

  async setRoomStatus(
    user: AuthenticatedUser,
    id: string,
    status: 'active' | 'rejected',
  ) {
    const property = await this.prisma.property.update({
      where: { id: this.parseId(id, 'Ma khach san khong hop le') },
      data: {
        status,
        reviewerId: this.parseId(user.id, 'Ma nguoi dung khong hop le'),
        reviewedAt: new Date(),
      },
      include: { partner: true },
    });
    await this.createNotification(this.prisma, {
      userId: property.partner.userId,
      type: status === 'active' ? 'property_approved' : 'property_rejected',
      title: status === 'active' ? 'Khach san da duoc duyet' : 'Khach san bi tu choi',
      body: status === 'active'
        ? `${property.name} da duoc phe duyet va co the mo ban.`
        : `${property.name} chua duoc phe duyet. Vui long kiem tra va cap nhat thong tin.`,
      entityType: 'property',
      entityId: property.id,
      data: { propertyId: Number(property.id), status },
    });
    return { ok: true };
  }

  async adminUpdateRoom(id: string, body: AnyBody) {
    const propertyId = this.parseId(id, 'Ma khach san khong hop le');
    await this.ensurePropertyCanBeChanged(propertyId);
    await this.updateRoomData(propertyId, body);
    return { ok: true };
  }

  async adminDeleteRoom(id: string) {
    await this.prisma.property.update({
      where: { id: this.parseId(id, 'Ma khach san khong hop le') },
      data: { status: property_status_enum.suspended },
    });
    return { ok: true };
  }

  async partnerRoomsForAdmin(userId: string) {
    const partner = await this.prisma.partnerProfile.findUnique({
      where: { userId: this.parseId(userId, 'Ma doi tac khong hop le') },
    });
    if (!partner) return { rooms: [] };
    const properties = await this.prisma.property.findMany({
      where: { partnerId: partner.id },
      include: this.propertyInclude(),
    });
    return { rooms: await this.mapRooms(properties) };
  }

  async partners(status?: string) {
    const where: Prisma.PartnerProfileWhereInput = {
      user: {
        deletedAt: null,
        status: { not: user_status_enum.deleted },
      },
    };
    if (status && status !== 'all') where.kycStatus = status as kyc_status_enum;
    const partners = await this.prisma.partnerProfile.findMany({
      where,
      include: {
        user: true,
        properties: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      partners: partners.map((partner) => ({
        id: partner.user.id,
        email: partner.user.email,
        fullName: partner.user.fullName,
        phone: partner.user.phone ?? '',
        hotelName: partner.businessName,
        status: partner.kycStatus,
        rejectReason: '',
        createdAt: partner.createdAt,
        reviewedAt: partner.kycReviewedAt,
        roomCount: partner.properties.length,
      })),
    };
  }

  async setPartnerStatus(userId: string, status: 'approved' | 'rejected') {
    const id = this.parseId(userId, 'Ma doi tac khong hop le');
    const partner = await this.prisma.partnerProfile.findFirst({
      where: {
        userId: id,
        user: {
          deletedAt: null,
          status: { not: user_status_enum.deleted },
        },
      },
      select: { id: true, userId: true, businessName: true },
    });
    if (!partner) throw new NotFoundException('Khong tim thay doi tac');

    await this.prisma.partnerProfile.update({
      where: { id: partner.id },
      data: { kycStatus: status },
    });
    await this.createNotification(this.prisma, {
      userId: partner.userId,
      type: status === 'approved' ? 'partner_approved' : 'partner_rejected',
      title: status === 'approved' ? 'Ho so doi tac da duoc duyet' : 'Ho so doi tac bi tu choi',
      body: status === 'approved'
        ? `${partner.businessName} da duoc phe duyet. Ban co the quan ly khach san.`
        : `${partner.businessName} chua duoc phe duyet. Vui long cap nhat ho so.`,
      entityType: 'partner',
      entityId: partner.id,
      data: { partnerId: Number(partner.id), status },
    });
    return { ok: true };
  }

  async updatePartner(id: string, body: AnyBody) {
    const data: Prisma.UserUpdateInput = {};
    if (typeof body.email === 'string') data.email = body.email;
    if (typeof body.fullName === 'string') data.fullName = body.fullName;
    if (typeof body.phone === 'string') data.phone = body.phone;
    if (typeof body.password === 'string' && body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }
    const userId = this.parseId(id, 'Ma nguoi dung khong hop le');
    const partner = await this.prisma.partnerProfile.findFirst({
      where: {
        userId,
        user: {
          deletedAt: null,
          status: { not: user_status_enum.deleted },
        },
      },
      select: { id: true },
    });
    if (!partner) throw new NotFoundException('Khong tim thay doi tac');

    await this.prisma.user.update({ where: { id: userId }, data });
    if (typeof body.hotelName === 'string') {
      await this.prisma.partnerProfile.update({
        where: { id: partner.id },
        data: { businessName: body.hotelName },
      });
    }
    return { ok: true };
  }

  async customers(search: string) {
    const users = await this.prisma.user.findMany({
      where: {
        userType: user_type_enum.customer,
        deletedAt: null,
        status: { not: user_status_enum.deleted },
        OR: search
          ? [
            { email: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
          ]
          : undefined,
      },
      include: {
        customerProfile: true,
        bookings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      customers: users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        status: user.status,
        loyaltyTier: user.customerProfile?.loyaltyTier ?? 'member',
        loyaltyPoints: user.customerProfile?.loyaltyPointsBalance ?? 0,
        bookingCount: user.bookings.length,
        activeBookingCount: user.bookings.filter((booking) =>
          ['confirmed', 'checked_in'].includes(booking.status),
        ).length,
        totalSpent: user.bookings.reduce(
          (sum, booking) => sum + Number(booking.totalAmount),
          0,
        ),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      })),
    };
  }

  async admins() {
    const admins = await this.prisma.user.findMany({
      where: { userType: user_type_enum.admin },
      orderBy: { createdAt: 'desc' },
    });
    return {
      admins: admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        isSuperAdmin: admin.isSuperAdmin,
        loginMethods: [admin.passwordHash ? 'password' : null, 'google'].filter(Boolean),
        createdAt: admin.createdAt,
      })),
    };
  }

  async createAdmin(body: AnyBody) {
    if (!body.email || !body.fullName) {
      throw new BadRequestException('Thieu thong tin');
    }
    const email = this.text(body.email).trim().toLowerCase();
    const password = this.text(body.password).trim();
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    await this.prisma.user.upsert({
      where: { email },
      update: {
        fullName: this.text(body.fullName),
        ...(passwordHash ? { passwordHash } : {}),
        userType: user_type_enum.admin,
        status: user_status_enum.active,
        deletedAt: null,
      },
      create: {
        email,
        fullName: this.text(body.fullName),
        passwordHash,
        userType: user_type_enum.admin,
        status: user_status_enum.active,
      },
    });
    return { ok: true };
  }

  async createGoogleAdmin(body: AnyBody) {
    if (!body.email) throw new BadRequestException('Thieu email');
    const email = this.text(body.email).trim().toLowerCase();
    const fullName = this.text(body.fullName, email.split('@')[0]).trim();
    await this.prisma.user.upsert({
      where: { email },
      update: {
        fullName,
        userType: user_type_enum.admin,
        status: user_status_enum.active,
        deletedAt: null,
      },
      create: {
        email,
        fullName,
        passwordHash: null,
        userType: user_type_enum.admin,
        status: user_status_enum.active,
      },
    });
    return { ok: true };
  }

  async updateAdmin(id: string, body: AnyBody) {
    const data: Prisma.UserUpdateInput = {};
    if (typeof body.email === 'string') data.email = body.email;
    if (typeof body.fullName === 'string') data.fullName = body.fullName;
    if (typeof body.password === 'string' && body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }
    await this.prisma.user.update({ where: { id: this.parseId(id, 'Ma quan tri vien khong hop le') }, data });
    return { ok: true };
  }

  async deleteUser(id: string) {
    await this.prisma.user.update({
      where: { id: this.parseId(id, 'Ma nguoi dung khong hop le') },
      data: { deletedAt: new Date(), status: user_status_enum.deleted },
    });
    return { ok: true };
  }

  async adminStats(period: string) {
    const now = new Date();
    const today = this.todayDateKey();
    let startDate: Date;
    let prevStartDate: Date;

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 23, 1);
    } else {
      // period === 'month'
      // Nếu hôm nay là đầu tháng (ngày 1 đến ngày 10), lấy từ ngày 1 của tháng trước
      if (now.getDate() <= 10) {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      const durationMs = now.getTime() - startDate.getTime();
      prevStartDate = new Date(startDate.getTime() - durationMs);
    }

    const [
      pendingPartners,
      pendingRooms,
      pendingChangeRequests,
      bookingsInPeriod,
      newCustomers,
      prevCustomers,
      periodBookings,
      prevPeriodBookings,
      periodStatusBookings,
      recentBookings,
      recentPartners,
      allBookings,
    ] = await Promise.all([
      this.prisma.partnerProfile.count({
        where: {
          kycStatus: 'pending',
          user: {
            deletedAt: null,
            status: { not: user_status_enum.deleted },
          },
        },
      }),
      this.prisma.property.count({
        where: { status: 'pending_review', deletedAt: null },
      }),
      this.legacyRows('property_change_requests').then(
        (rows) => rows.filter((row) => row.status === 'pending').length,
      ),
      this.prisma.booking.count({ where: { createdAt: { gte: startDate } } }),
      this.prisma.user.count({
        where: {
          userType: 'customer',
          deletedAt: null,
          status: { not: user_status_enum.deleted },
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.user.count({
        where: {
          userType: 'customer',
          deletedAt: null,
          status: { not: user_status_enum.deleted },
          createdAt: { gte: prevStartDate, lt: startDate },
        },
      }),
      this.prisma.booking.findMany({
        where: { status: { not: 'cancelled' }, createdAt: { gte: startDate } },
        include: { property: true },
      }),
      this.prisma.booking.findMany({
        where: {
          status: { not: 'cancelled' },
          createdAt: { gte: prevStartDate, lt: startDate },
        },
        include: { property: true },
      }),
      this.prisma.booking.findMany({ where: { createdAt: { gte: startDate } } }),
      this.prisma.booking.findMany({
        take: 5,
        include: { customer: true, property: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.partnerProfile.findMany({
        take: 5,
        where: {
          user: {
            deletedAt: null,
            status: { not: user_status_enum.deleted },
          },
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.findMany(),
    ]);

    const completedBookings = periodBookings.filter((booking) =>
      this.isBookingCompletedForDashboard(booking, today),
    );
    const prevCompletedBookings = prevPeriodBookings.filter((booking) =>
      this.isBookingCompletedForDashboard(booking, today),
    );
    const activeBookings = allBookings.filter((booking) => {
      const checkIn = this.toDateKey(booking.checkInDate);
      const checkOut = this.toDateKey(booking.checkOutDate);
      return (
        booking.status === 'checked_in' ||
        (booking.status === 'confirmed' && checkIn <= today && checkOut > today)
      );
    }).length;
    const pendingBookings = allBookings.filter((booking) =>
      booking.status === 'pending',
    ).length;
    const totalRevenue = completedBookings.reduce(
      (sum, booking) => sum + Number(booking.totalAmount),
      0,
    );
    const prevRevenue = prevCompletedBookings.reduce(
      (sum, booking) => sum + Number(booking.totalAmount),
      0,
    );
    const revenueGrowth =
      prevRevenue === 0
        ? totalRevenue > 0
          ? 100
          : 0
        : ((totalRevenue - prevRevenue) / prevRevenue) * 100;
    const customerGrowth =
      prevCustomers === 0
        ? newCustomers > 0
          ? 100
          : 0
        : ((newCustomers - prevCustomers) / prevCustomers) * 100;
    const trends = this.groupBookingTrends(completedBookings, period);
    const groupedHotels = this.groupBy(completedBookings, (booking) => String(booking.propertyId));
    const topHotels = [...groupedHotels.values()]
      .map((rows) => {
        const property = rows[0].property;
        return {
          id: property.id,
          name: property.name,
          city: property.city,
          revenue: rows.reduce((sum, booking) => sum + Number(booking.totalAmount), 0),
          orders: rows.length,
          commission: rows.reduce((sum, booking) => sum + this.bookingPlatformFee(booking), 0),
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const groupedCities = this.groupBy(completedBookings, (booking) => booking.property.city || '');
    const topCities = [...groupedCities.entries()]
      .map(([city, rows]) => ({
        city,
        bookings: rows.length,
        revenue: rows.reduce((sum, booking) => sum + Number(booking.totalAmount), 0),
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);
    const bookingStats = {
      confirmed: periodStatusBookings.filter((booking) =>
        ['confirmed', 'checked_in', 'checked_out'].includes(booking.status),
      ).length,
      canceled: periodStatusBookings.filter((booking) => booking.status === 'cancelled')
        .length,
      refunded: periodStatusBookings.filter(
        (booking) => booking.paymentStatus === 'refunded',
      ).length,
    };
    const recentActivity = [
      ...recentBookings.map((booking) => ({
        type: 'booking',
        user: booking.customer.fullName,
        action: 'vua dat phong',
        target: booking.property.name,
        time: booking.createdAt,
        targetId: booking.id,
      })),
      ...recentPartners.map((partner) => ({
        type: 'partner',
        user: partner.user.fullName,
        action: 'da dang ky doi tac',
        target: partner.businessName,
        time: partner.createdAt,
        targetId: partner.id,
      })),
    ]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 10);

    return {
      totalRevenue,
      period,
      revenueGrowth,
      pendingPartners,
      pendingRooms,
      pendingRoomChangeRequests: pendingChangeRequests,
      pendingBookingActions: pendingBookings,
      activeBookings,
      bookingsInPeriod,
      newCustomers,
      customerGrowth,
      trends,
      recentActivity,
      topHotels,
      topCities,
      bookingStats,
    };
  }

  async bookingReport(user?: AuthenticatedUser) {
    const partner = user ? await this.partnerProfile(user) : null;
    const properties = await this.prisma.property.findMany({
      where: {
        partnerId: partner?.id,
      },
      include: {
        partner: { include: { user: true } },
        bookings: { 
          include: { customer: true, roomType: true }, 
          orderBy: { createdAt: 'desc' } 
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      hotels: properties.map((property) => ({
        propertyId: property.id,
        propertyName: property.name,
        city: property.city,
        address: property.address,
        partnerHotelName: property.partner.businessName,
        partnerEmail: property.partner.user.email,
        propertyStatus: property.status,
        isArchived: this.isArchivedProperty(property),
        archivedLabel: this.isArchivedProperty(property) ? 'Khách sạn đã ngừng hoạt động' : null,
        isActiveHotel: property.status === 'active' && !property.deletedAt,
        bookings: property.bookings.map((booking) => this.mapBooking(booking)),
      })),
    };
  }

  async partnerBookingAction(user: AuthenticatedUser, id: string, action: string) {
    const statusByAction: Record<string, booking_status_enum> = {
      'check-in': booking_status_enum.checked_in,
      'check-out': booking_status_enum.checked_out,
      'no-show': booking_status_enum.no_show,
    };
    const status = statusByAction[action];
    if (!status) throw new BadRequestException('Hanh dong khong hop le');
    const partner = await this.partnerProfile(user);
    const booking = await this.prisma.booking.findFirst({
      where: { id: this.parseId(id, 'Ma booking khong hop le'), property: { partnerId: partner.id } },
      include: { property: true },
    });
    if (!booking) throw new ForbiddenException('Khong co quyen thao tac booking nay');
    if (this.isArchivedProperty(booking.property)) {
      throw new BadRequestException('Khach san da ngung hoat dong, chi duoc xem lich su booking');
    }
    const updateData: Prisma.BookingUpdateInput = { status };
    if (action === 'check-in' || action === 'check-out') {
      updateData.paymentStatus = payment_status_enum.paid;
    }
    await this.prisma.booking.update({ where: { id: booking.id }, data: updateData });
    return { ok: true };
  }

  async adminCancelBooking(id: string) {
    const bookingId = this.parseId(id, 'Ma booking khong hop le');
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          include: {
            policy: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Khong tim thay dat phong');
    }

    if (
      booking.status === booking_status_enum.cancelled ||
      booking.status === booking_status_enum.checked_out
    ) {
      throw new BadRequestException('Booking da bi huy hoac check-out');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: booking_status_enum.cancelled,
          cancelledAt: new Date(),
          cancellationReason: booking.cancellationReason?.startsWith('PENDING_CANCEL')
            ? `Yêu cầu hủy được duyệt: ${booking.cancellationReason.replace('PENDING_CANCEL:', '').trim()}`
            : 'Admin huy don hang',
        },
      });

      // Restore availability
      const inventoryRows = await tx.$queryRaw<Array<{ ratePlanId: bigint; roomsCount: bigint }>>`
        SELECT
          rate_plan_id AS "ratePlanId",
          COUNT(*)::bigint AS "roomsCount"
        FROM booking_rooms
        WHERE booking_id = ${booking.id}
        GROUP BY rate_plan_id
      `;

      for (const inventoryRow of inventoryRows) {
        await tx.dailyRate.updateMany({
          where: {
            ratePlanId: inventoryRow.ratePlanId,
            date: {
              gte: booking.checkInDate,
              lt: booking.checkOutDate,
            },
          },
          data: {
            availableQty: {
              increment: Number(inventoryRow.roomsCount),
            },
          },
        });
      }
    });

    return { ok: true };
  }

  async adminMarkBookingPaid(id: string) {
    const bookingId = this.parseId(id, 'Ma booking khong hop le');
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Khong tim thay dat phong');
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: payment_status_enum.paid,
        status: booking_status_enum.confirmed,
      },
    });
    return { ok: true };
  }

  async adminRejectBookingCancel(id: string) {
    const bookingId = this.parseId(id, 'Ma booking khong hop le');
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Khong tim thay dat phong');
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        cancellationReason: booking.cancellationReason?.startsWith('PENDING_CANCEL')
          ? `Từ chối hủy: ${booking.cancellationReason.replace('PENDING_CANCEL:', '').trim()}`
          : null,
      },
    });
    return { ok: true };
  }

  async mine(user: AuthenticatedUser) {
    const bookings = await this.prisma.booking.findMany({
      where: { customerId: this.parseId(user.id, 'Ma nguoi dung khong hop le') },
      include: { customer: true, property: true, roomType: true },
      orderBy: { createdAt: 'desc' },
    });
    return { bookings: bookings.map((booking) => this.mapBooking(booking)) };
  }

  async bookingStatus(user: AuthenticatedUser, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: this.parseId(id, 'Ma booking khong hop le'), customerId: this.parseId(user.id, 'Ma nguoi dung khong hop le') },
      include: { customer: true, property: true },
    });
    if (!booking) throw new NotFoundException('Khong tim thay dat phong');
    return { booking: this.mapBooking(booking) };
  }

  async createBooking(user: AuthenticatedUser, body: AnyBody) {
    const propertyId = this.parseId(body.propertyId ?? body.hotelId, 'Thieu thong tin dat phong');
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { roomTypes: { include: { ratePlans: true } } },
    });
    if (!property) throw new NotFoundException('Khong tim thay khach san');
    if (property.deletedAt || property.status !== property_status_enum.active) {
      throw new BadRequestException('Cho nghi nay hien khong con nhan dat phong');
    }
    const roomType = property.roomTypes[0];
    const ratePlan = roomType?.ratePlans[0];
    if (!roomType || !ratePlan) throw new BadRequestException('Khach san chua co gia phong');

    const checkInDate = this.dateOnly(body.checkInDate ?? body.checkIn);
    const checkOutDate = this.dateOnly(body.checkOutDate ?? body.checkOut);
    const numNights = Math.max(
      1,
      Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86400000),
    );
    const roomsNeeded = Number(body.roomsNeeded ?? 1);
    const subtotalAmount = new Prisma.Decimal(ratePlan.basePrice)
      .times(numNights)
      .times(roomsNeeded);
    const platformFeeAmount = subtotalAmount.times(0.1);
    const booking = await this.prisma.booking.create({
      data: {
        bookingCode: `BK${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        customerId: this.parseId(user.id, 'Ma nguoi dung khong hop le'),
        propertyId: property.id,
        roomTypeId: roomType.id,
        ratePlanId: ratePlan.id,
        checkInDate,
        checkOutDate,
        numNights,
        numAdults: Number(body.adults ?? body.numAdults ?? 2),
        numChildren: Number(body.children ?? body.numChildren ?? 0),
        subtotalAmount,
        totalAmount: subtotalAmount,
        platformFeeAmount,
        partnerPayoutAmount: subtotalAmount.minus(platformFeeAmount),
        specialRequests: typeof body.specialRequests === 'string' ? body.specialRequests : undefined,
        status: booking_status_enum.pending,
        paymentStatus: payment_status_enum.unpaid,
      },
    });
    return {
      id: booking.id,
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        totalAmount: Number(booking.totalAmount),
      },
    };
  }

  async mockPayment(user: AuthenticatedUser, body: AnyBody) {
    const bookingId = this.parseId(body.bookingId ?? body.id, 'Ma booking khong hop le');
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, customerId: this.parseId(user.id, 'Ma nguoi dung khong hop le') },
      include: { property: true },
    });
    if (!booking) throw new NotFoundException('Khong tim thay dat phong');
    if (this.isArchivedProperty(booking.property)) {
      throw new BadRequestException('Cho nghi nay hien khong con nhan thanh toan moi');
    }
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: payment_status_enum.paid,
        status: booking_status_enum.confirmed,
      },
    });
    return { ok: true };
  }

  async availability(user: AuthenticatedUser, query: Record<string, string>) {
    const partner = await this.partnerProfile(user);
    const propertyId = this.parseId(query.propertyId, 'Ma khach san khong hop le');
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, partnerId: partner.id },
      include: {
        roomTypes: {
          include: {
            ratePlans: {
              include: {
                dailyRates: true,
                // Use the correct relation: RatePlan has bookings[]
                bookings: true,
              },
            },
          },
        },
      },
    });
    if (!property) throw new ForbiddenException('Khong co quyen truy cap');

    const fromDate = query.from ? new Date(`${query.from}T00:00:00Z`) : new Date();
    const toDate = query.to ? new Date(`${query.to}T00:00:00Z`) : new Date(Date.now() + 30 * 86400000);

    // Build list of dates in range
    const allDates: string[] = [];
    for (const cursor = new Date(fromDate); cursor <= toDate; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      allDates.push(cursor.toISOString().slice(0, 10));
    }

    return {
      propertyId: property.id,
      propertyName: property.name,
      isArchived: this.isArchivedProperty(property),
      isBookable: property.status === property_status_enum.active && !property.deletedAt,
      prices: property.roomTypes.flatMap((roomType) =>
        roomType.ratePlans.map((ratePlan) => {
          // Map dailyRate overrides by date string
          const rateByDate = new Map(
            ratePlan.dailyRates.map((r) => [r.date.toISOString().slice(0, 10), r]),
          );

          // Count booked rooms per stay-date from active bookings on this ratePlan
          const bookedByDate = new Map<string, number>();
          const activeStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out'];
          for (const bk of ratePlan.bookings ?? []) {
            if (!activeStatuses.includes(bk.status as string)) continue;
            const checkIn = new Date(bk.checkInDate);
            const checkOut = new Date(bk.checkOutDate);
            if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) continue;
            // Each night from checkIn up to (not including) checkOut
            for (
              const d = new Date(checkIn);
              d < checkOut;
              d.setUTCDate(d.getUTCDate() + 1)
            ) {
              const key = d.toISOString().slice(0, 10);
              bookedByDate.set(key, (bookedByDate.get(key) ?? 0) + 1);
            }
          }

          const days = allDates.map((dateStr) => {
            const override = rateByDate.get(dateStr);
            // isClosed = explicit override with availableQty=0 and no current bookings
            const booked = bookedByDate.get(dateStr) ?? 0;
            const isClosed = override
              ? override.availableQty === 0 && booked === 0
              : false;
            const totalInventory = isClosed
              ? 0
              : (override ? override.availableQty : roomType.totalRooms);
            const remaining = Math.max(0, totalInventory - booked);
            const pricePerNight = override
              ? Number(override.price)
              : Number(ratePlan.basePrice);
            const isSoldOut = !isClosed && remaining === 0 && booked > 0;

            return {
              date: dateStr,
              totalInventory: isClosed ? 0 : (override ? override.availableQty : roomType.totalRooms),
              booked,
              remaining,
              pricePerNight,
              isClosed,
              hasOverride: !!override,
              isSoldOut,
            };
          });

          const openDays = days.filter((d) => !d.isClosed);
          const minRemaining = openDays.length > 0
            ? Math.min(...openDays.map((d) => d.remaining))
            : roomType.totalRooms;
          const isAvailable = days.some((d) => !d.isClosed && !d.isSoldOut && d.remaining > 0);

          return {
            priceId: ratePlan.id,
            label: ratePlan.name,
            pricePerNight: Number(ratePlan.basePrice),
            totalInventory: roomType.totalRooms,
            minRemaining,
            isAvailable,
            days,
          };
        }),
      ),
    };
  }

  async updateAvailability(user: AuthenticatedUser, body: AnyBody) {
    const partner = await this.partnerProfile(user);
    const ratePlanId = this.parseId(body.priceId, 'Ma goi gia khong hop le');
    // Accept both stayDate (bulk internal) and date (from frontend single-day edit)
    const date = this.dateOnly(body.stayDate ?? body.date);
    const ratePlan = await this.prisma.ratePlan.findUnique({
      where: { id: ratePlanId },
      include: { roomType: { include: { property: true } } },
    });
    if (!ratePlan) throw new NotFoundException('Khong tim thay goi gia');
    if (ratePlan.roomType.property.partnerId !== partner.id) {
      throw new ForbiddenException('Khong co quyen chinh ton kho cua khach san nay');
    }
    if (ratePlan.roomType.property.status !== property_status_enum.active || ratePlan.roomType.property.deletedAt) {
      throw new BadRequestException('Khach san da ngung hoat dong, khong the mo ban hoac chinh ton kho');
    }
    // Accept frontend field names: pricePerNight/openInventory AND legacy: price/inventory
    const newPrice = body.pricePerNight ?? body.price;
    const newInventory = body.openInventory ?? body.inventory;
    // isClosed: if true, set availableQty=0
    const resolvedInventory = body.isClosed ? 0 : (newInventory !== undefined ? Number(newInventory) : undefined);
    // reset: delete override so it falls back to base values
    if (body.reset) {
      await this.prisma.dailyRate.deleteMany({ where: { ratePlanId, date } });
      return { ok: true };
    }
    await this.prisma.dailyRate.upsert({
      where: { ratePlanId_date: { ratePlanId, date } },
      create: {
        ratePlanId,
        date,
        price: newPrice !== undefined ? Number(newPrice) : Number(ratePlan.basePrice),
        availableQty: resolvedInventory !== undefined ? resolvedInventory : ratePlan.roomType.totalRooms,
      },
      update: {
        price: newPrice !== undefined ? Number(newPrice) : undefined,
        availableQty: resolvedInventory !== undefined ? resolvedInventory : undefined,
      },
    });
    return { ok: true };
  }

  async bulkUpdateAvailability(user: AuthenticatedUser, body: AnyBody) {
    // Accept both startDate/endDate (legacy) and from/to (frontend current)
    const start = this.dateOnly(body.startDate ?? body.from);
    const end = body.applyForever
      ? new Date(start.getTime() + 365 * 86400000)
      : this.dateOnly(body.endDate ?? body.to);
    if (end < start) throw new BadRequestException('Khoang ngay khong hop le');
    const maxDays = 366;
    const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (totalDays > maxDays) throw new BadRequestException('Chi duoc cap nhat toi da 366 ngay moi lan');
    let updated = 0;
    const skipped: string[] = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const dateStr = cursor.toISOString().slice(0, 10);
      try {
        await this.updateAvailability(user, { ...body, stayDate: dateStr });
        updated++;
      } catch {
        skipped.push(dateStr);
      }
    }
    return { ok: true, updated, skipped };
  }

  async notifications(user: AuthenticatedUser) {
    const rows = await this.prisma.$queryRaw<NotificationRow[]>`
      SELECT
        id,
        type,
        channel,
        title,
        body,
        data,
        entity_type AS "entityType",
        entity_id AS "entityId",
        is_read AS "isRead",
        read_at AS "readAt",
        created_at AS "createdAt"
      FROM notifications
      WHERE user_id = ${this.parseId(user.id, 'Ma nguoi dung khong hop le')}
      ORDER BY created_at DESC, id DESC
    `;
    return {
      notifications: rows.map((row) => this.mapNotificationRow(row)),
    };
  }

  async unreadCount(user: AuthenticatedUser) {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM notifications
      WHERE user_id = ${this.parseId(user.id, 'Ma nguoi dung khong hop le')}
        AND is_read = FALSE
    `;
    return {
      count: Number(rows[0]?.count ?? 0),
    };
  }

  async markNotificationRead(user: AuthenticatedUser, id: string) {
    const notificationId = this.parseId(id, 'Ma thong bao khong hop le');
    await this.prisma.$executeRaw`
      UPDATE notifications
      SET is_read = TRUE,
          read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE id = ${notificationId}
        AND user_id = ${this.parseId(user.id, 'Ma nguoi dung khong hop le')}
    `;
    return { ok: true };
  }

  async markAllNotificationsRead(user: AuthenticatedUser) {
    await this.prisma.$executeRaw`
      UPDATE notifications
      SET is_read = TRUE,
          read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE user_id = ${this.parseId(user.id, 'Ma nguoi dung khong hop le')}
        AND is_read = FALSE
    `;
    return { ok: true };
  }

  async deleteNotification(user: AuthenticatedUser, id: string) {
    const notificationId = this.parseId(id, 'Ma thong bao khong hop le');
    await this.prisma.$executeRaw`
      DELETE FROM notifications
      WHERE id = ${notificationId}
        AND user_id = ${this.parseId(user.id, 'Ma nguoi dung khong hop le')}
    `;
    return { ok: true };
  }

  placesSearch(q: string) {
    return { places: q ? [{ name: q, type: 'search', lat: 0, lon: 0 }] : [] };
  }

  placesNearby(query: Record<string, string>) {
    return { places: [], query };
  }

  private isSuperAdminEmail(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    const emails = (this.configService.get<string>('SUPER_ADMIN_EMAILS') ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return emails.includes(normalized);
  }

  private async isSuperAdminUser(user: AuthenticatedUser): Promise<boolean> {
    if (user.isSuperAdmin) return true;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: BigInt(user.id) },
      select: { id: true, email: true, isSuperAdmin: true },
    });

    if (!dbUser) return false;
    if (dbUser.isSuperAdmin) return true;

    if (this.isSuperAdminEmail(dbUser.email)) {
      await this.prisma.user.update({
        where: { id: dbUser.id },
        data: { isSuperAdmin: true },
      });
      return true;
    }

    return false;
  }

  private parsePositiveAmount(value: unknown, label = 'So tien'): number {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(`${label} phai la so duong`);
    }
    return Math.round(amount);
  }

  private parseTransactionType(value: unknown): 'DEPOSIT' | 'WITHDRAW' {
    if (value === 'DEPOSIT' || value === 'WITHDRAW') return value;
    throw new BadRequestException('Loai giao dich khong hop le');
  }

  private mapNotificationRow(row: NotificationRow) {
    return {
      id: Number(row.id),
      type: row.type,
      channel: row.channel,
      title: row.title,
      body: row.body,
      data: row.data,
      entityType: row.entityType,
      entityId: row.entityId === null ? null : Number(row.entityId),
      isRead: row.isRead,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }

  private async notifyAdmins(
    db: Prisma.TransactionClient | PrismaService,
    notification: Omit<NotificationInput, 'userId'>,
  ) {
    const admins = await db.user.findMany({
      where: {
        userType: user_type_enum.admin,
        deletedAt: null,
        status: { not: user_status_enum.deleted },
      },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.createNotification(db, { ...notification, userId: admin.id });
    }
  }

  private async createNotification(
    db: Prisma.TransactionClient | PrismaService,
    notification: NotificationInput,
  ) {
    const dataJson = JSON.stringify(notification.data ?? {});
    await db.$executeRaw`
      INSERT INTO notifications (
        user_id,
        type,
        channel,
        title,
        body,
        data,
        entity_type,
        entity_id
      )
      VALUES (
        ${notification.userId},
        ${notification.type},
        ${notification.channel ?? 'in_app'},
        ${notification.title},
        ${notification.body ?? null},
        ${dataJson}::jsonb,
        ${notification.entityType ?? null},
        ${notification.entityId ?? null}
      )
    `;
  }

  private async legacyRows(sourceTable: string): Promise<AnyBody[]> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ payload: AnyBody }>>`
        SELECT payload
        FROM legacy_source_rows
        WHERE source_table = ${sourceTable}
        ORDER BY (payload->>'created_at') DESC NULLS LAST, source_id DESC
      `;
      return rows.map((row) => row.payload);
    } catch {
      return [];
    }
  }

  private async updateRoomData(
    id: bigint,
    body: AnyBody,
    status?: property_status_enum,
    user?: AuthenticatedUser,
  ) {
    const payload = this.normalizeRoomPayload(body);
    await this.prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id },
        data: {
          name: payload.name,
          propertyType: payload.propertyType,
          description: payload.description,
          address: payload.address,
          city: payload.city,
          latitude: payload.latitude,
          longitude: payload.longitude,
          starRating: payload.starRating,
          status,
        },
      });
      await tx.roomType.deleteMany({ where: { propertyId: id } });
      await this.upsertRoomTypes(tx, id, payload, user?.id);
      await this.upsertPolicy(tx, id, body);
      await this.saveLegacyData(tx, id, body, user?.id);
    });
  }

  private async upsertRoomTypes(
    tx: Prisma.TransactionClient,
    propertyId: bigint,
    payload: ReturnType<CompatService['normalizeRoomPayload']>,
    userId?: string,
  ) {
    let uploadedById = userId ? BigInt(userId) : null;
    if (!uploadedById) {
      const prop = await tx.property.findUnique({
        where: { id: propertyId },
        select: { partner: { select: { userId: true } } },
      });
      uploadedById = prop?.partner?.userId ?? 1n;
    }

    for (const price of payload.prices) {
      const roomType = await tx.roomType.create({
        data: {
          propertyId,
          name: price.label,
          description: payload.description,
          areaSqm: price.area,
          bedConfiguration: price.bedInfo,
          maxOccupancy: price.capacity,
          totalRooms: price.totalInventory,
          basePrice: price.pricePerNight,
          isActive: true,
        },
      });
      await tx.ratePlan.create({
        data: {
          roomTypeId: roomType.id,
          name: price.label || 'Standard Rate',
          basePrice: price.pricePerNight,
          refundable: payload.policy.refundable,
          isActive: true,
        },
      });
      await tx.room.createMany({
        data: Array.from({ length: Math.max(1, price.totalInventory) }, (_, index) => ({
          propertyId,
          roomTypeId: roomType.id,
          roomNumber: `${roomType.id}-${index + 1}`,
        })),
        skipDuplicates: true,
      });

      // Save room type amenities
      const roomAmenities = typeof price.amenities === 'string'
        ? price.amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : [];
      for (const name of roomAmenities) {
        let amenity = await tx.amenity.findUnique({
          where: { name },
        });
        if (!amenity) {
          amenity = await tx.amenity.create({
            data: {
              name,
              category: 'general',
              isActive: true,
            },
          });
        }
        await tx.roomTypeAmenity.create({
          data: {
            roomTypeId: roomType.id,
            amenityId: amenity.id,
          },
        });
      }

      // Save room type images
      if (Array.isArray(price.imageUrls)) {
        for (let i = 0; i < price.imageUrls.length; i++) {
          const url = price.imageUrls[i];
          if (!url || !url.trim()) continue;
          await tx.propertyMedia.create({
            data: {
              propertyId,
              roomTypeId: roomType.id,
              category: 'room',
              url: url.trim(),
              isCover: i === 0,
              sortOrder: i,
              uploadedById,
            },
          });
        }
      }
    }
  }

  private async upsertPolicy(tx: Prisma.TransactionClient, propertyId: bigint, body: AnyBody) {
    const policy = (body.policy ?? {}) as AnyBody;
    await tx.propertyPolicy.upsert({
      where: { propertyId },
      create: {
        propertyId,
        checkInFrom: this.time(policy.checkInTime, '14:00'),
        checkOutUntil: this.time(policy.checkOutTime, '12:00'),
        cancellationType: policy.refundable === false ? 'non_refundable' : 'flexible',
        freeCancelHours: this.optionalNumber(policy.freeCancelHours),
        petsAllowed: Boolean(policy.petAllowed),
        smokingAllowed: Boolean(policy.smokingAllowed),
        customRules: typeof policy.otherRules === 'string' ? policy.otherRules : undefined,
      },
      update: {
        checkInFrom: this.time(policy.checkInTime, '14:00'),
        checkOutUntil: this.time(policy.checkOutTime, '12:00'),
        cancellationType: policy.refundable === false ? 'non_refundable' : 'flexible',
        freeCancelHours: this.optionalNumber(policy.freeCancelHours),
        petsAllowed: Boolean(policy.petAllowed),
        smokingAllowed: Boolean(policy.smokingAllowed),
        customRules: typeof policy.otherRules === 'string' ? policy.otherRules : undefined,
      },
    });
  }

  private async saveLegacyData(
    tx: Prisma.TransactionClient,
    propertyId: bigint,
    body: AnyBody,
    userId?: string,
  ) {
    const highlights = Array.isArray(body.highlights) ? body.highlights : [];
    const transport = Array.isArray(body.transportConnections) ? body.transportConnections : [];
    const amenities = Array.isArray(body.amenities) ? body.amenities : [];
    const nearbyPlaces = Array.isArray(body.nearbyPlaces) ? body.nearbyPlaces : [];
    const images = Array.isArray(body.images) ? body.images : [];

    let uploadedById = userId ? BigInt(userId) : null;
    if (!uploadedById) {
      const prop = await tx.property.findUnique({
        where: { id: propertyId },
        select: { partner: { select: { userId: true } } },
      });
      uploadedById = prop?.partner?.userId ?? 1n;
    }

    // 1. Save property legacy row
    const propertyPayload = {
      highlights_json: JSON.stringify(highlights),
      transport_connections_json: JSON.stringify(transport),
      amenities_json: JSON.stringify(amenities),
    };

    await tx.$executeRaw`
      INSERT INTO legacy_source_rows (source_table, source_id, payload)
      VALUES ('properties', ${propertyId.toString()}, ${JSON.stringify(propertyPayload)}::jsonb)
      ON CONFLICT (source_table, source_id)
      DO UPDATE SET payload = EXCLUDED.payload;
    `;

    // 2. Save nearby places legacy rows. First delete any existing nearby places for this property
    await tx.$executeRaw`
      DELETE FROM legacy_source_rows
      WHERE source_table = 'property_nearby_places'
        AND payload->>'property_id' = ${propertyId.toString()};
    `;

    // Now insert the new nearby places
    for (const place of nearbyPlaces) {
      const placePayload = {
        property_id: propertyId.toString(),
        name: this.text(place.name, ''),
        type: this.text(place.type, ''),
        distance_m: this.optionalNumber(place.distanceM ?? place.distance_m) ?? 0,
        latitude: this.optionalNumber(place.lat ?? place.latitude) ?? 0,
        longitude: this.optionalNumber(place.lon ?? place.longitude) ?? 0,
      };

      await tx.$executeRaw`
        INSERT INTO legacy_source_rows (source_table, payload)
        VALUES ('property_nearby_places', ${JSON.stringify(placePayload)}::jsonb);
      `;
    }

    // Update main properties table columns for sync
    const formattedTransport = transport.map(item => {
      if (typeof item === 'string') {
        const [name, distance] = item.split(':').map((part) => part.trim());
        return { name, distance: distance || '' };
      }
      if (item && typeof item === 'object') {
        return {
          name: String(item.name || ''),
          distance: String(item.distance || ''),
        };
      }
      return null;
    }).filter(Boolean);

    const formattedNearby = nearbyPlaces.map(place => {
      const name = place.name;
      if (!name) return null;
      
      const distanceM = Number(place.distanceM ?? place.distance_m ?? 0);
      const distanceText = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)}km` : `${distanceM}m`;
      
      return {
        name,
        type: place.category || place.type || 'poi',
        distanceM,
        distance: distanceText,
        lat: Number(place.latitude ?? place.lat ?? 0),
        lon: Number(place.longitude ?? place.lon ?? 0),
      };
    }).filter(Boolean);

    await tx.property.update({
      where: { id: propertyId },
      data: {
        transportConnections: formattedTransport,
        nearbyPlaces: formattedNearby,
      },
    });

    // 3. Save property amenities
    await tx.propertyAmenity.deleteMany({
      where: { propertyId },
    });

    for (const name of amenities) {
      if (typeof name !== 'string' || !name.trim()) continue;
      const cleanName = name.trim();
      let amenity = await tx.amenity.findUnique({
        where: { name: cleanName },
      });
      if (!amenity) {
        amenity = await tx.amenity.create({
          data: {
            name: cleanName,
            category: 'general',
            isActive: true,
          },
        });
      }
      await tx.propertyAmenity.create({
        data: {
          propertyId,
          amenityId: amenity.id,
        },
      });
    }

    // 4. Save property media (images)
    await tx.propertyMedia.deleteMany({
      where: { propertyId, roomTypeId: null },
    });

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (typeof img?.url !== 'string' || !img.url.trim()) continue;
      
      const cleanUrl = img.url.trim();
      const caption = typeof img.caption === 'string' ? img.caption.trim() : null;
      
      let category: any = 'other';
      const cleanCat = typeof img.category === 'string' ? img.category.toLowerCase().trim() : '';
      if (['exterior', 'interior', 'room', 'bathroom', 'dining', 'pool', 'amenity', 'other'].includes(cleanCat)) {
        category = cleanCat;
      } else if (cleanCat === 'front') {
        category = 'exterior';
      } else if (cleanCat === 'lobby' || cleanCat === 'common_area') {
        category = 'interior';
      }

      await tx.propertyMedia.create({
        data: {
          propertyId,
          category,
          url: cleanUrl,
          caption,
          isCover: i === 0,
          sortOrder: i,
          uploadedById,
        },
      });
    }
  }

  private normalizeRoomPayload(body: AnyBody) {
    const prices = Array.isArray(body.prices) ? (body.prices as AnyBody[]) : [];
    if (!prices.length) {
      throw new BadRequestException('Can it nhat mot hang phong hop le');
    }
    const roomTypeText = this.text(body.roomType, '');
    const name = this.text(body.name, '').trim();
    const address = this.text(body.address, '').trim();
    const city = this.text(body.city, '').trim();
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!name) throw new BadRequestException('Ten khach san la bat buoc');
    if (!address) throw new BadRequestException('Dia chi khach san la bat buoc');
    if (!city) throw new BadRequestException('Thanh pho la bat buoc');
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new BadRequestException('Vi do khong hop le');
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Kinh do khong hop le');
    }
    const normalizedPrices = prices.map((price, index) => {
      const label = this.text(price.label, '').trim();
      const pricePerNight = Number(price.pricePerNight);
      const totalInventory = Number(price.totalInventory ?? 1);
      const capacity = Number(price.capacity ?? body.capacity ?? 2);
      const area = this.optionalNumber(price.area);
      if (!label) throw new BadRequestException(`Ten hang phong #${index + 1} la bat buoc`);
      if (!Number.isFinite(pricePerNight) || pricePerNight <= 0) {
        throw new BadRequestException(`Gia hang phong #${index + 1} khong hop le`);
      }
      if (!Number.isInteger(totalInventory) || totalInventory <= 0) {
        throw new BadRequestException(`So phong phuc vu/ngay cua hang phong #${index + 1} khong hop le`);
      }
      if (!Number.isInteger(capacity) || capacity <= 0) {
        throw new BadRequestException(`Suc chua hang phong #${index + 1} khong hop le`);
      }
      if (area !== null && (!Number.isFinite(area) || area <= 0)) {
        throw new BadRequestException(`Dien tich hang phong #${index + 1} khong hop le`);
      }
      return {
        label,
        pricePerNight,
        totalInventory,
        area,
        capacity,
        bedInfo: typeof price.bedInfo === 'string' ? price.bedInfo : null,
        imageUrls: Array.isArray(price.imageUrls) ? price.imageUrls.map(u => String(u).trim()).filter(Boolean) : [],
        amenities: typeof price.amenities === 'string' ? price.amenities : '',
      };
    });
    return {
      name,
      description: typeof body.description === 'string' ? body.description : null,
      address,
      city,
      latitude,
      longitude,
      propertyType: this.propertyTypeFromText(roomTypeText),
      starRating: this.starFromText(roomTypeText),
      prices: normalizedPrices,
      policy: {
        refundable: ((body.policy as AnyBody | undefined)?.refundable ?? true) as boolean,
      },
    };
  }

  private async mapOneRoom(property: CompatProperty) {
    const legacyRows = await this.loadLegacyRows([property.id]);
    return this.mapRoom(property, legacyRows.get(property.id.toString()));
  }

  private async mapRooms(properties: CompatProperty[]) {
    const legacyRows = await this.loadLegacyRows(properties.map((property) => property.id));
    return properties.map((property) => this.mapRoom(property, legacyRows.get(property.id.toString())));
  }

  private async loadLegacyRows(propertyIds: bigint[]): Promise<LegacyRowsByPropertyId> {
    const rowsByPropertyId: LegacyRowsByPropertyId = new Map(
      propertyIds.map((id) => [id.toString(), { nearby: [] }]),
    );
    if (propertyIds.length === 0) return rowsByPropertyId;

    const sourceIds = propertyIds.map((id) => id.toString());
    const propertyRows = await this.prisma.$queryRaw<Array<{ source_id: string | null; payload: LegacyPropertyPayload }>>`
      SELECT source_id, payload
      FROM legacy_source_rows
      WHERE source_table = 'properties'
        AND source_id IN (${Prisma.join(sourceIds)})
    `;
    for (const row of propertyRows) {
      if (!row.source_id) continue;
      const bucket = rowsByPropertyId.get(row.source_id) ?? { nearby: [] };
      bucket.property = row.payload;
      rowsByPropertyId.set(row.source_id, bucket);
    }

    const nearbyRows = await this.prisma.$queryRaw<Array<{ payload: LegacyNearbyPayload }>>`
      SELECT payload
      FROM legacy_source_rows
      WHERE source_table = 'property_nearby_places'
        AND payload->>'property_id' IN (${Prisma.join(sourceIds)})
      ORDER BY (payload->>'distance_m')::int ASC NULLS LAST
    `;
    for (const row of nearbyRows) {
      const propertyId = this.text(row.payload.property_id, '');
      if (!propertyId) continue;
      const bucket = rowsByPropertyId.get(propertyId) ?? { nearby: [] };
      bucket.nearby.push(row.payload);
      rowsByPropertyId.set(propertyId, bucket);
    }

    return rowsByPropertyId;
  }

  private mapRoom(property: CompatProperty, legacy?: { property?: LegacyPropertyPayload; nearby: LegacyNearbyPayload[] }) {
    const firstRoomType = property.roomTypes[0];
    const propertyRoomImages = property.media
      .filter((media) => media.category === 'room')
      .map((media) => media.url);
    const propertyFallbackImages = propertyRoomImages.length
      ? propertyRoomImages
      : property.media.map((media) => media.url);
    const prices = property.roomTypes.flatMap((roomType) =>
      roomType.ratePlans.map((ratePlan) => ({
        id: ratePlan.id,
        label: ratePlan.name,
        pricePerNight: Number(ratePlan.basePrice),
        totalInventory: roomType.totalRooms,
        area: roomType.areaSqm === null ? null : Number(roomType.areaSqm),
        capacity: roomType.maxOccupancy,
        bedInfo: roomType.bedConfiguration,
        amenities: roomType.amenities.map((item) => item.amenity.name).join(', '),
        imageUrls: roomType.media.map((media) => media.url).length
          ? roomType.media.map((media) => media.url)
          : propertyFallbackImages.slice(0, 4),
      })),
    );
    const media = property.media.length ? property.media : [{ category: 'other', url: DEFAULT_IMAGE, caption: null }];
    const legacyProperty = legacy?.property;
    const legacyAmenities = this.parseStringList(legacyProperty?.amenities_json);
    const legacyHighlights = this.parseStringList(legacyProperty?.highlights_json);
    const legacyTransportConnections = this.parseTransportConnections(legacyProperty?.transport_connections_json);
    const legacyNearbyPlaces = this.parseNearbyPlaces(legacy?.nearby ?? []);
    return {
      id: property.id,
      name: property.name,
      description: property.description,
      roomType: property.starRating ? `${property.starRating} sao` : property.propertyType,
      address: property.address,
      city: property.city,
      latitude: Number(property.latitude),
      longitude: Number(property.longitude),
      area: firstRoomType?.areaSqm ? Number(firstRoomType.areaSqm) : null,
      capacity: firstRoomType?.maxOccupancy ?? 2,
      amenities: property.amenities.map((item) => item.amenity.name).length
        ? property.amenities.map((item) => item.amenity.name)
        : legacyAmenities,
      highlights: legacyHighlights,
      transportConnections: legacyTransportConnections,
      nearbyPlaces: legacyNearbyPlaces,
      images: media.map((item) => ({
        category: item.category,
        url: item.url,
        caption: item.caption,
      })),
      policy: {
        checkInTime: this.formatTime(property.policy?.checkInFrom ?? property.checkInTime),
        checkOutTime: this.formatTime(property.policy?.checkOutUntil ?? property.checkOutTime),
        childrenFreeAge: null,
        refundable: property.policy?.cancellationType !== 'non_refundable',
        freeCancelHours: property.policy?.freeCancelHours ?? null,
        cancellationNote: null,
        petAllowed: property.policy?.petsAllowed ?? false,
        smokingAllowed: property.policy?.smokingAllowed ?? false,
        otherRules: property.policy?.customRules ?? null,
      },
      prices,
      platformFeePct: 10,
      promotionPct: 0,
      status: property.status,
      isArchived: this.isArchivedProperty(property),
      isBookable: property.status === property_status_enum.active && !property.deletedAt,
      archivedLabel: this.isArchivedProperty(property) ? 'Khách sạn đã ngừng hoạt động' : null,
      rejectReason: null,
      createdAt: property.createdAt,
      reviewedAt: property.reviewedAt,
      pendingRequest: null,
      partnerHotelName: property.partner.businessName,
      partnerEmail: property.partner.user.email,
      bookingStats: {
        isActiveHotel: property.status === 'active' && !property.deletedAt,
        hasCurrentGuest: false,
        activeBookingCount: property.bookings.filter((booking) =>
          ['confirmed', 'checked_in'].includes(booking.status),
        ).length,
        totalBookings: property.bookings.length,
        grossRevenue: property.bookings.reduce((sum, booking) => sum + Number(booking.totalAmount), 0),
        partnerRevenue: property.bookings.reduce((sum, booking) => sum + Number(booking.partnerPayoutAmount), 0),
      },
    };
  }

  private parseStringList(value: unknown): string[] {
    const parsed = this.parseLegacyJson(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => this.text(item, ''))
        .filter(Boolean);
    }
    if (typeof parsed === 'string') {
      return parsed
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  private parseTransportConnections(value: unknown) {
    const parsed = this.parseLegacyJson(value);
    const rows = Array.isArray(parsed) ? parsed : typeof parsed === 'string' ? parsed.split('|') : [];
    return rows
      .map((item) => {
        if (typeof item === 'string') {
          const [name, distance] = item.split(':').map((part) => part.trim());
          return name ? { name, distance: distance || '', note: null } : null;
        }
        if (item && typeof item === 'object') {
          const row = item as Record<string, unknown>;
          const name = this.text(row.name, '');
          return name
            ? {
              name,
              distance: this.text(row.distance, ''),
              note: this.text(row.note, '') || null,
            }
            : null;
        }
        return null;
      })
      .filter((item): item is { name: string; distance: string; note: string | null } => Boolean(item));
  }

  private parseNearbyPlaces(rows: LegacyNearbyPayload[]) {
    return rows
      .map((row) => {
        const name = this.text(row.name, '');
        if (!name) return null;
        return {
          name,
          type: this.text(row.category, ''),
          distanceM: Number(row.distance_m ?? 0),
          lat: Number(row.latitude ?? 0),
          lon: Number(row.longitude ?? 0),
        };
      })
      .filter((item): item is { name: string; type: string; distanceM: number; lat: number; lon: number } => Boolean(item));
  }

  private parseLegacyJson(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  private mapBooking(booking: CompatBooking) {
    const checkIn = this.toDateKey(booking.checkInDate);
    const checkOut = this.toDateKey(booking.checkOutDate);
    const today = this.todayDateKey();
    const isCancelled = booking.status === 'cancelled';
    const isCurrentStay =
      !isCancelled &&
      (booking.status === 'checked_in' ||
        (['pending', 'confirmed'].includes(booking.status) && checkIn <= today && checkOut > today));
    // Khách đang checked_in chưa phải là "completed" dù đã qua ngày checkout
    const isCompleted =
      !isCancelled &&
      !isCurrentStay &&
      (booking.status === 'checked_out' || checkOut <= today);
    const isFutureStay =
      !isCancelled &&
      ['pending', 'confirmed'].includes(booking.status) &&
      checkIn > today;

    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      customerName: booking.customer?.fullName ?? '',
      customerEmail: booking.customer?.email ?? '',
      customerPhone: booking.customer?.phone ?? '',
      priceLabel: booking.roomType?.name ?? null,
      propertyId: booking.propertyId,
      propertyName: booking.property?.name ?? '',
      city: booking.property?.city ?? null,
      address: booking.property?.address ?? '',
      propertyStatus: booking.property?.status ?? null,
      propertyIsArchived: booking.property ? this.isArchivedProperty(booking.property) : false,
      propertyArchivedLabel: booking.property && this.isArchivedProperty(booking.property) ? 'Khách sạn đã ngừng hoạt động' : null,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights: booking.numNights,
      adults: booking.numAdults,
      children: booking.numChildren,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      total: Number(booking.totalAmount),
      platformFee: this.bookingPlatformFee(booking),
      partnerPayout: Number(booking.partnerPayoutAmount),
      createdAt: booking.createdAt,
      specialRequests: booking.specialRequests ?? '',
      cancellationReason: booking.cancellationReason ?? null,
      isCompleted,
      isCurrentStay,
      isFutureStay,
    };
  }

  private isBookingCompletedForDashboard(
    booking: Pick<CompatBooking, 'status' | 'checkOutDate'>,
    today: string,
  ) {
    return (
      booking.status !== 'cancelled' &&
      booking.status !== 'no_show' &&
      booking.status !== 'checked_in' &&
      (booking.status === 'checked_out' || this.toDateKey(booking.checkOutDate) <= today)
    );
  }

  private bookingPlatformFee(
    booking: Pick<CompatBooking, 'platformFeeAmount' | 'partnerPayoutAmount' | 'totalAmount'>,
  ) {
    const storedFee = Number(booking.platformFeeAmount);
    if (storedFee > 0) return storedFee;

    const inferredFee = Number(booking.totalAmount) - Number(booking.partnerPayoutAmount);
    return inferredFee > 0 ? inferredFee : 0;
  }

  private isBookingActiveForDashboard(
    booking: Pick<CompatBooking, 'status' | 'checkInDate' | 'checkOutDate'>,
    today: string,
  ) {
    if (booking.status === 'cancelled' || this.isBookingCompletedForDashboard(booking, today)) {
      return false;
    }

    const checkIn = this.toDateKey(booking.checkInDate);
    const checkOut = this.toDateKey(booking.checkOutDate);

    return (
      booking.status === 'checked_in' ||
      (['pending', 'confirmed'].includes(booking.status) && checkIn <= today && checkOut > today)
    );
  }

  private isArchivedProperty(property: { status: property_status_enum; deletedAt: Date | null }) {
    return property.status === property_status_enum.suspended || Boolean(property.deletedAt);
  }

  private propertyInclude() {
    return {
      partner: { include: { user: true } },
      policy: true,
      bookings: true,
      amenities: { include: { amenity: true } },
      media: { orderBy: [{ isCover: 'desc' as const }, { sortOrder: 'asc' as const }] },
      roomTypes: {
        where: { deletedAt: null },
        include: {
          media: true,
          amenities: { include: { amenity: true } },
          ratePlans: { where: { isActive: true } },
        },
      },
    };
  }

  private groupBookingTrends(
    bookings: Array<CompatBooking & { property: Prisma.PropertyGetPayload<Record<string, never>> }>,
    period: string,
  ) {
    const grouped = this.groupBy(bookings, (booking) => {
      const key = this.toDateKey(booking.createdAt);
      return period === 'year' ? key.slice(0, 7) : key;
    });
    return [...grouped.entries()]
      .map(([name, rows]) => ({
        name,
        bookings: rows.length,
        revenue: rows.reduce((sum, booking) => sum + Number(booking.totalAmount), 0),
        fullDate: rows
          .map((booking) => booking.createdAt)
          .sort((a, b) => a.getTime() - b.getTime())[0],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private groupBy<T>(rows: T[], keyFor: (row: T) => string) {
    const grouped = new Map<string, T[]>();
    for (const row of rows) {
      const key = keyFor(row);
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }
    return grouped;
  }

  private async partnerProfile(user: AuthenticatedUser) {
    const partner = await this.prisma.partnerProfile.findUnique({
      where: { userId: this.parseId(user.id, 'Ma nguoi dung khong hop le') },
    });
    if (!partner) throw new ForbiddenException('Khong tim thay profile doi tac');
    return partner;
  }

  private describeDevice(userAgent?: string | null) {
    if (!userAgent) return 'Trinh duyet web';
    if (/mobile|android|iphone|ipad/i.test(userAgent)) return 'Thiet bi di dong';
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    return 'Trinh duyet web';
  }

  private accountPermissions(isAdmin: boolean, isPartner: boolean) {
    if (isAdmin) {
      return [
        { name: 'Quản trị hệ thống', description: 'Xem dashboard, khách hàng, đặt phòng và thông báo toàn hệ thống', enabled: true },
        { name: 'Duyệt đối tác', description: 'Phê duyệt, từ chối và cập nhật hồ sơ đối tác', enabled: true },
        { name: 'Quản lý admin', description: 'Tạo và cập nhật tài khoản quản trị viên', enabled: true },
      ];
    }
    if (isPartner) {
      return [
        { name: 'Quản lý khách sạn', description: 'Tạo và cập nhật hồ sơ khách sạn thuộc tài khoản', enabled: true },
        { name: 'Quản lý đặt phòng', description: 'Theo dõi doanh thu, xác nhận và xử lý đặt phòng', enabled: true },
        { name: 'Quản lý nhân viên', description: 'Tính năng phân quyền nhân viên sẽ mở sau khi có sub-user', enabled: false },
      ];
    }
    return [];
  }

  private async ensurePartnerOwnsProperty(partnerId: bigint, propertyId: bigint) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, partnerId },
    });
    if (!property) throw new ForbiddenException('Khong co quyen truy cap');
  }

  private async ensurePropertyCanBeChanged(propertyId: bigint) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { status: true, deletedAt: true },
    });
    if (!property) throw new NotFoundException('Khong tim thay khach san');
    if (property.deletedAt || property.status === property_status_enum.suspended) {
      throw new BadRequestException('Khach san da ngung hoat dong, chi duoc xem lich su');
    }
  }

  private async uniqueSlug(name: string) {
    const base = this.slugify(name);
    let slug = base;
    let suffix = 1;
    while (await this.prisma.property.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }

  private slugify(value: string) {
    return (
      value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 240) || `property-${Date.now()}`
    );
  }

  private dateOnly(value: unknown) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
      throw new BadRequestException('Ngay khong hop le');
    }
    const key = value.slice(0, 10);
    const date = new Date(`${key}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== key) {
      throw new BadRequestException('Ngay khong hop le');
    }
    return date;
  }

  private parseId(value: unknown, message: string) {
    const text = typeof value === 'bigint' ? value.toString() : typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
    if (!/^\d+$/.test(text)) throw new BadRequestException(message);
    return BigInt(text);
  }

  private toDateKey(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private todayDateKey() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  private time(value: unknown, fallback: string) {
    const text = typeof value === 'string' ? value : fallback;
    return new Date(`1970-01-01T${text.length === 5 ? `${text}:00` : text}.000Z`);
  }

  private formatTime(value: Date) {
    return value.toISOString().slice(11, 16);
  }

  private optionalNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    return Number(value);
  }

  private text(value: unknown, fallback = '') {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return fallback;
  }

  private propertyTypeFromText(value: string): property_type_enum {
    const lower = value.toLowerCase();
    if (lower.includes('resort')) return property_type_enum.resort;
    if (lower.includes('homestay')) return property_type_enum.homestay;
    if (lower.includes('villa')) return property_type_enum.villa;
    if (lower.includes('apartment')) return property_type_enum.apartment;
    return property_type_enum.hotel;
  }

  private starFromText(value: string) {
    const match = /([1-5])/.exec(value);
    return match ? Number(match[1]) : null;
  }

  private getDbPath() {
    return path.join(process.cwd(), 'nowayhome_pay_db.json');
  }

  private readPayDb() {
    const dbPath = this.getDbPath();
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ partners: {} }, null, 2));
    }
    try {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch {
      return { partners: {} };
    }
  }

  private writePayDb(data: any) {
    fs.writeFileSync(this.getDbPath(), JSON.stringify(data, null, 2));
  }

  async getNowayhomePayStatus(user: AuthenticatedUser) {
    const partner = await this.partnerProfile(user);
    const db = this.readPayDb();
    const partnerIdStr = partner.id.toString();
    const regData = db.partners[partnerIdStr] || { registered: false };

    if (!regData.registered) {
      return { registered: false };
    }

    const properties = await this.prisma.property.findMany({
      where: { partnerId: partner.id },
      include: {
        bookings: {
          include: { customer: true, roomType: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    let walletBalance = 0;
    const transactions: any[] = [];
    const today = this.todayDateKey();

    for (const property of properties) {
      for (const booking of property.bookings) {
        const checkIn = this.toDateKey(booking.checkInDate);
        const checkOut = this.toDateKey(booking.checkOutDate);
        const isCancelled = booking.status === 'cancelled';
        const isCurrentStay =
          !isCancelled &&
          (booking.status === 'checked_in' ||
            (booking.status === 'confirmed' && checkIn <= today && checkOut > today));
        const isCompleted =
          !isCancelled &&
          !isCurrentStay &&
          (booking.status === 'checked_out' || checkOut <= today);

        if (isCompleted) {
          const totalAmount = Number(booking.totalAmount);
          const platformFeeAmount = this.bookingPlatformFee(booking);
          const partnerPayoutAmount = Number(booking.partnerPayoutAmount);

          if (booking.paymentStatus === 'paid') {
            transactions.push({
              id: `TX-CUST-${booking.id}`,
              bookingCode: booking.bookingCode,
              hotelName: property.name,
              partnerName: partner.businessName,
              amount: totalAmount,
              type: 'CUSTOMER_PAY',
              method: 'ONLINE',
              status: 'SUCCESS',
              createdAt: booking.checkOutDate,
            });
            transactions.push({
              id: `TX-SYS-${booking.id}`,
              bookingCode: booking.bookingCode,
              hotelName: property.name,
              partnerName: partner.businessName,
              amount: partnerPayoutAmount,
              type: 'SYSTEM_PAY_TO_PARTNER',
              method: 'ONLINE',
              status: 'SUCCESS',
              createdAt: booking.checkOutDate,
            });
            walletBalance += partnerPayoutAmount;
          } else {
            transactions.push({
              id: `TX-COMM-${booking.id}`,
              bookingCode: booking.bookingCode,
              hotelName: property.name,
              partnerName: partner.businessName,
              amount: platformFeeAmount,
              type: 'COMMISSION_DEDUCTION',
              method: 'CASH',
              status: 'SUCCESS',
              createdAt: booking.checkOutDate,
            });
            walletBalance -= platformFeeAmount;
          }
        }
      }
    }

    const partnerDepositsAndWithdrawals = regData.partnerDepositsAndWithdrawals || [];
    for (const tx of partnerDepositsAndWithdrawals) {
      if (tx.type === 'DEPOSIT') {
        walletBalance += Number(tx.amount);
      } else if (tx.type === 'WITHDRAW') {
        walletBalance -= Number(tx.amount);
      }
    }

    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      registered: true,
      bankName: regData.bankName,
      bankAccountNumber: regData.bankAccountNumber,
      bankAccountHolder: regData.bankAccountHolder,
      virtualCustomerAccountNumber: regData.virtualCustomerAccountNumber,
      walletBalance,
      transactions,
      depositsAndWithdrawals: partnerDepositsAndWithdrawals,
    };
  }

  async registerNowayhomePay(user: AuthenticatedUser, body: Record<string, unknown>) {
    const partner = await this.partnerProfile(user);
    const db = this.readPayDb();
    const partnerIdStr = partner.id.toString();
    const randomAccountNumber = 'NWH-PAY-' + Math.floor(100000 + Math.random() * 900000);

    db.partners[partnerIdStr] = {
      registered: true,
      bankName: body.bankName,
      bankAccountNumber: body.bankAccountNumber,
      bankAccountHolder: body.bankAccountHolder || partner.businessName,
      virtualCustomerAccountNumber: randomAccountNumber,
    };

    this.writePayDb(db);
    return { success: true };
  }

  async getAdminTransactions() {
    const properties = await this.prisma.property.findMany({
      include: {
        partner: { include: { user: true } },
        bookings: {
          include: { customer: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const transactions: any[] = [];
    const today = this.todayDateKey();

    for (const property of properties) {
      const partner = property.partner;
      const partnerName = partner.businessName;

      for (const booking of property.bookings) {
        const checkIn = this.toDateKey(booking.checkInDate);
        const checkOut = this.toDateKey(booking.checkOutDate);
        const isCancelled = booking.status === 'cancelled';
        const isCurrentStay =
          !isCancelled &&
          (booking.status === 'checked_in' ||
            (booking.status === 'confirmed' && checkIn <= today && checkOut > today));
        const isCompleted =
          !isCancelled &&
          !isCurrentStay &&
          (booking.status === 'checked_out' || checkOut <= today);

        if (isCompleted) {
          const totalAmount = Number(booking.totalAmount);
          const platformFeeAmount = this.bookingPlatformFee(booking);
          const partnerPayoutAmount = Number(booking.partnerPayoutAmount);

          if (booking.paymentStatus === 'paid') {
            transactions.push({
              id: `TX-CUST-${booking.id}`,
              bookingCode: booking.bookingCode,
              hotelName: property.name,
              partnerName,
              amount: totalAmount,
              type: 'CUSTOMER_PAY',
              method: 'ONLINE',
              status: 'SUCCESS',
              createdAt: booking.checkOutDate,
            });
            transactions.push({
              id: `TX-SYS-${booking.id}`,
              bookingCode: booking.bookingCode,
              hotelName: property.name,
              partnerName,
              amount: partnerPayoutAmount,
              type: 'SYSTEM_PAY_TO_PARTNER',
              method: 'ONLINE',
              status: 'SUCCESS',
              createdAt: booking.checkOutDate,
            });
          } else {
            transactions.push({
              id: `TX-COMM-${booking.id}`,
              bookingCode: booking.bookingCode,
              hotelName: property.name,
              partnerName,
              amount: platformFeeAmount,
              type: 'COMMISSION_DEDUCTION',
              method: 'CASH',
              status: 'SUCCESS',
              createdAt: booking.checkOutDate,
            });
          }
        }
      }
    }

    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { transactions };
  }

  async getAdminTransactionsDashboard(user: AuthenticatedUser) {
    const db = this.readPayDb();
    const today = this.todayDateKey();

    const dbPartners = await this.prisma.partnerProfile.findMany({
      include: {
        user: true,
        properties: {
          include: {
            bookings: {
              include: { customer: true, roomType: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    const transactions: any[] = [];
    let platformFeeRevenue = 0;

    const partners = dbPartners.map((p) => {
      const partnerIdStr = p.id.toString();
      const regData = db.partners[partnerIdStr] || { registered: false };
      const partnerDepositsAndWithdrawals = regData.partnerDepositsAndWithdrawals || [];

      let walletBalance = 0;

      for (const property of p.properties) {
        for (const booking of property.bookings) {
          const checkIn = this.toDateKey(booking.checkInDate);
          const checkOut = this.toDateKey(booking.checkOutDate);
          const isCancelled = booking.status === 'cancelled';
          const isCurrentStay =
            !isCancelled &&
            (booking.status === 'checked_in' ||
              (booking.status === 'confirmed' && checkIn <= today && checkOut > today));
          const isCompleted =
            !isCancelled &&
            !isCurrentStay &&
            (booking.status === 'checked_out' || checkOut <= today);

          if (isCompleted) {
            const platformFeeAmount = this.bookingPlatformFee(booking);
            const partnerPayoutAmount = Number(booking.partnerPayoutAmount);

            if (booking.paymentStatus === 'paid') {
              walletBalance += partnerPayoutAmount;
            } else {
              walletBalance -= platformFeeAmount;
            }
          }
        }
      }

      for (const tx of partnerDepositsAndWithdrawals) {
        if (tx.type === 'DEPOSIT') {
          walletBalance += Number(tx.amount);
        } else if (tx.type === 'WITHDRAW') {
          walletBalance -= Number(tx.amount);
        }
      }

      return {
        id: p.id.toString(),
        businessName: p.businessName,
        email: p.user.email,
        phone: p.user.phone || '',
        registered: regData.registered,
        bankName: regData.bankName || '',
        bankAccountNumber: regData.bankAccountNumber || '',
        bankAccountHolder: regData.bankAccountHolder || '',
        virtualCustomerAccountNumber: regData.virtualCustomerAccountNumber || '',
        walletBalance,
        depositsAndWithdrawals: partnerDepositsAndWithdrawals,
        propertyNames: p.properties.map((prop) => prop.name),
      };
    });

    const properties = await this.prisma.property.findMany({
      include: {
        partner: { include: { user: true } },
        bookings: {
          include: { customer: true, roomType: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    for (const property of properties) {
      const partner = property.partner;
      for (const booking of property.bookings) {
        const checkIn = this.toDateKey(booking.checkInDate);
        const checkOut = this.toDateKey(booking.checkOutDate);
        const isCancelled = booking.status === 'cancelled';
        const isCurrentStay =
          !isCancelled &&
          (booking.status === 'checked_in' ||
            (booking.status === 'confirmed' && checkIn <= today && checkOut > today));
        const isCompleted =
          !isCancelled &&
          !isCurrentStay &&
          (booking.status === 'checked_out' || checkOut <= today);

        if (isCompleted) {
          const totalAmount = Number(booking.totalAmount);
          const platformFeeAmount = this.bookingPlatformFee(booking);
          const partnerPayoutAmount = Number(booking.partnerPayoutAmount);

          platformFeeRevenue += platformFeeAmount;

          if (booking.paymentStatus === 'paid') {
            transactions.push({
              id: `TX-CUST-${booking.id}`,
              bookingId: booking.id.toString(),
              bookingCode: booking.bookingCode,
              hotelName: property.name,
              partnerName: partner.businessName,
              customerName: booking.customer?.fullName || '',
              customerEmail: booking.customer?.email || '',
              checkInDate: checkIn,
              checkOutDate: checkOut,
              nights: booking.numNights,
              amount: totalAmount,
              platformFee: platformFeeAmount,
              partnerPayout: partnerPayoutAmount,
              type: 'CUSTOMER_PAY',
              method: 'ONLINE',
              status: 'SUCCESS',
              createdAt: booking.checkOutDate,
            });
            transactions.push({
              id: `TX-SYS-${booking.id}`,
              bookingId: booking.id.toString(),
              bookingCode: booking.bookingCode,
              hotelName: property.name,
              partnerName: partner.businessName,
              customerName: booking.customer?.fullName || '',
              customerEmail: booking.customer?.email || '',
              checkInDate: checkIn,
              checkOutDate: checkOut,
              nights: booking.numNights,
              amount: partnerPayoutAmount,
              platformFee: platformFeeAmount,
              partnerPayout: partnerPayoutAmount,
              type: 'SYSTEM_PAY_TO_PARTNER',
              method: 'ONLINE',
              status: 'SUCCESS',
              createdAt: booking.checkOutDate,
            });
          } else {
            transactions.push({
              id: `TX-COMM-${booking.id}`,
              bookingId: booking.id.toString(),
              bookingCode: booking.bookingCode,
              hotelName: property.name,
              partnerName: partner.businessName,
              customerName: booking.customer?.fullName || '',
              customerEmail: booking.customer?.email || '',
              checkInDate: checkIn,
              checkOutDate: checkOut,
              nights: booking.numNights,
              amount: platformFeeAmount,
              platformFee: platformFeeAmount,
              partnerPayout: partnerPayoutAmount,
              type: 'COMMISSION_DEDUCTION',
              method: 'CASH',
              status: 'SUCCESS',
              createdAt: booking.checkOutDate,
            });
          }
        }
      }
    }

    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const systemInfo = db.system || { initialBalance: 1125230, depositsAndWithdrawals: [], paidTaxes: [] };
    const initialBalance = Number(systemInfo.initialBalance || 1125230);
    const systemDepositsAndWithdrawals = systemInfo.depositsAndWithdrawals || [];
    const paidTaxes = systemInfo.paidTaxes || [];
    const systemBankAccountNumber = '110011011102';
    const systemBankName = 'Vietcombank';
    const openingBalanceTransaction =
      initialBalance > 0
        ? {
            id: 'SYS-OPENING-BALANCE',
            type: 'DEPOSIT',
            amount: initialBalance,
            targetBank: systemBankName,
            targetAccount: systemBankAccountNumber,
            targetHolder: 'Admin tổng',
            status: 'SUCCESS',
            createdAt: systemInfo.initialBalanceCreatedAt || '2026-03-01T00:00:00.000Z',
            description: 'Nạp số dư ban đầu',
            isOpeningBalance: true,
          }
        : null;

    let systemDepositsSum = 0;
    let systemWithdrawalsSum = 0;
    for (const item of systemDepositsAndWithdrawals) {
      if (item.type === 'DEPOSIT') {
        systemDepositsSum += Number(item.amount);
      } else if (item.type === 'WITHDRAW') {
        systemWithdrawalsSum += Number(item.amount);
      }
    }

    let paidTaxesSum = 0;
    for (const item of paidTaxes) {
      paidTaxesSum += Number(item.amount);
    }

    const systemBalance = initialBalance + platformFeeRevenue + systemDepositsSum - systemWithdrawalsSum - paidTaxesSum;

    const monthlyTaxes: any[] = [];
    const monthlyCommissions: Record<string, number> = {};

    for (const property of properties) {
      for (const booking of property.bookings) {
        const checkIn = this.toDateKey(booking.checkInDate);
        const checkOut = this.toDateKey(booking.checkOutDate);
        const isCancelled = booking.status === 'cancelled';
        const isCurrentStay =
          !isCancelled &&
          (booking.status === 'checked_in' ||
            (booking.status === 'confirmed' && checkIn <= today && checkOut > today));
        const isCompleted =
          !isCancelled &&
          !isCurrentStay &&
          (booking.status === 'checked_out' || checkOut <= today);

        if (isCompleted) {
          const platformFeeAmount = this.bookingPlatformFee(booking);
          const monthKey = booking.checkOutDate.toISOString().slice(0, 7);
          monthlyCommissions[monthKey] = (monthlyCommissions[monthKey] || 0) + platformFeeAmount;
        }
      }
    }

    const startMonth = new Date(2026, 2, 1);
    const endMonth = new Date();
    
    let currentMonth = new Date(startMonth);
    while (currentMonth <= endMonth) {
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const commission = monthlyCommissions[monthKey] || 0;
      const taxDue = commission * 0.1;
      
      const taxPaidRecord = paidTaxes.find((t: any) => t.month === monthKey);
      
      monthlyTaxes.push({
        month: monthKey,
        commission,
        taxDue,
        status: taxPaidRecord ? 'PAID' : 'UNPAID',
        paidAt: taxPaidRecord ? taxPaidRecord.createdAt : null,
      });

      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    monthlyTaxes.sort((a, b) => b.month.localeCompare(a.month));

    return {
      transactions,
      partners,
      system: {
        bankAccountNumber: systemBankAccountNumber,
        bankName: systemBankName,
        initialBalance,
        platformFeeRevenue,
        balance: systemBalance,
        depositsAndWithdrawals: openingBalanceTransaction
          ? [openingBalanceTransaction, ...systemDepositsAndWithdrawals]
          : systemDepositsAndWithdrawals,
        paidTaxes,
        monthlyTaxes,
      },
    };
  }

  async addSystemTransaction(user: AuthenticatedUser, body: Record<string, unknown>) {
    const isSuperAdmin = await this.isSuperAdminUser(user);
    if (!isSuperAdmin) {
      throw new ForbiddenException('Chi co admin tong moi duoc phep thao tac nap/rut tai khoan he thong');
    }
    const type = this.parseTransactionType(body.type);
    const amount = this.parsePositiveAmount(body.amount);

    const db = this.readPayDb();
    if (!db.system) {
      db.system = { initialBalance: 1125230, depositsAndWithdrawals: [], paidTaxes: [] };
    }

    const newTx = {
      id: `SYS-TX-${Math.floor(100000 + Math.random() * 900000)}`,
      type,
      amount,
      targetBank: body.targetBank || 'Vietcombank',
      targetAccount: body.targetAccount || '110011011102',
      targetHolder: body.targetHolder || 'Company Account',
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    db.system.depositsAndWithdrawals.push(newTx);
    this.writePayDb(db);
    return { success: true, transaction: newTx };
  }

  async paySystemTax(user: AuthenticatedUser, body: Record<string, unknown>) {
    const isSuperAdmin = await this.isSuperAdminUser(user);
    if (!isSuperAdmin) {
      throw new ForbiddenException('Chi co admin tong moi duoc phep dong thue');
    }

    const db = this.readPayDb();
    if (!db.system) {
      db.system = { initialBalance: 1125230, depositsAndWithdrawals: [], paidTaxes: [] };
    }

    const month = body.month as string;
    const amount = this.parsePositiveAmount(body.amount, 'So tien thue');

    const existing = db.system.paidTaxes.find((t: any) => t.month === month);
    if (existing) {
      throw new BadRequestException(`Thue thang ${month} da duoc dong truoc do`);
    }

    const newTaxPayment = {
      month,
      amount,
      createdAt: new Date().toISOString(),
    };

    db.system.paidTaxes.push(newTaxPayment);
    this.writePayDb(db);
    return { success: true, taxPayment: newTaxPayment };
  }

  async addPartnerTransaction(user: AuthenticatedUser, body: Record<string, unknown>) {
    const isSuperAdmin = await this.isSuperAdminUser(user);
    if (!isSuperAdmin) {
      throw new ForbiddenException('Chi co admin tong moi duoc phep nap/rut vi doi tac');
    }
    const db = this.readPayDb();
    const partnerIdStr = body.partnerId as string;
    
    if (!db.partners[partnerIdStr]) {
      throw new NotFoundException('Doi tac chua dang ky NowayhomePay');
    }

    if (!db.partners[partnerIdStr].partnerDepositsAndWithdrawals) {
      db.partners[partnerIdStr].partnerDepositsAndWithdrawals = [];
    }

    const type = this.parseTransactionType(body.type);
    const amount = this.parsePositiveAmount(body.amount);

    const newTx = {
      id: `PART-TX-${Math.floor(100000 + Math.random() * 900000)}`,
      type,
      amount,
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    db.partners[partnerIdStr].partnerDepositsAndWithdrawals.push(newTx);
    this.writePayDb(db);
    return { success: true, transaction: newTx };
  }

  async addPartnerSelfTransaction(user: AuthenticatedUser, body: Record<string, unknown>) {
    const partner = await this.partnerProfile(user);
    const db = this.readPayDb();
    const partnerIdStr = partner.id.toString();
    
    if (!db.partners[partnerIdStr]) {
      throw new NotFoundException('Doi tac chua dang ky NowayhomePay');
    }

    if (!db.partners[partnerIdStr].partnerDepositsAndWithdrawals) {
      db.partners[partnerIdStr].partnerDepositsAndWithdrawals = [];
    }
    const type = this.parseTransactionType(body.type);
    const amount = this.parsePositiveAmount(body.amount);
    if (type === 'WITHDRAW') {
      const status = await this.getNowayhomePayStatus(user);
      if (amount > Number(status.walletBalance || 0)) {
        throw new BadRequestException('So du vi khong du de rut tien');
      }
    }

    const newTx = {
      id: `PART-TX-${Math.floor(100000 + Math.random() * 900000)}`,
      type,
      amount,
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    db.partners[partnerIdStr].partnerDepositsAndWithdrawals.push(newTx);
    this.writePayDb(db);
    return { success: true, transaction: newTx };
  }

  private async deletePreviousAvatar(previousUrl?: string | null, nextUrl?: string | null) {
    if (!previousUrl || previousUrl === nextUrl) return;
    await this.deleteLocalAvatar(previousUrl);
    await this.deleteCloudinaryAvatar(previousUrl);
  }

  private async deleteLocalAvatar(avatarUrl?: string | null) {
    if (!avatarUrl?.startsWith('/api/uploads/avatars/')) return;

    const avatarsDirectory = path.resolve(process.cwd(), 'uploads', 'avatars');
    const fileName = path.basename(avatarUrl);
    const filePath = path.resolve(avatarsDirectory, fileName);
    if (!filePath.startsWith(`${avatarsDirectory}${path.sep}`)) return;

    await fs.promises.unlink(filePath).catch(() => undefined);
  }

  private async deleteCloudinaryAvatar(avatarUrl?: string | null) {
    if (!avatarUrl || !avatarUrl.includes('/nowayhome/avatars/')) return;

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME') ?? '';
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY') ?? '';
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET') ?? '';
    if (!cloudName || !apiKey || !apiSecret) return;

    const publicId = this.extractCloudinaryPublicId(avatarUrl);
    if (!publicId) return;

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => undefined);
  }

  private extractCloudinaryPublicId(avatarUrl: string) {
    const uploadMarker = '/upload/';
    const uploadIndex = avatarUrl.indexOf(uploadMarker);
    if (uploadIndex === -1) return null;

    let publicPath = avatarUrl.slice(uploadIndex + uploadMarker.length).split(/[?#]/)[0];
    publicPath = publicPath.replace(/^v\d+\//, '');
    const extension = path.extname(publicPath);
    return extension ? publicPath.slice(0, -extension.length) : publicPath;
  }
}
