import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { property_status_enum } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { UpdatePropertyStatusDto } from './dto/update-property-status.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async updateKycStatus(
    adminUser: AuthenticatedUser,
    partnerProfileId: string,
    dto: UpdateKycStatusDto,
  ) {
    const id = this.parseBigIntParam(partnerProfileId, 'partnerProfileId');
    const reviewerId = BigInt(adminUser.id);

    const partner = await this.prisma.partnerProfile.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException(`PartnerProfile #${partnerProfileId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.partnerProfile.update({
        where: { id },
        data: {
          kycStatus: dto.status,
          kycReviewerId: reviewerId,
          kycReviewedAt: new Date(),
        },
      });

      await this.createNotification(tx, {
        userId: updated.userId,
        type: dto.status === 'approved' ? 'partner_approved' : 'partner_rejected',
        title: dto.status === 'approved' ? 'Ho so doi tac da duoc duyet' : 'Ho so doi tac bi tu choi',
        body: dto.status === 'approved'
          ? 'Ho so doi tac cua ban da duoc phe duyet.'
          : 'Ho so doi tac cua ban chua duoc phe duyet. Vui long cap nhat thong tin.',
        entityType: 'partner',
        entityId: updated.id,
        data: { partnerId: Number(updated.id), status: dto.status },
      });

      return updated;
    });
  }

  async updatePropertyStatus(
    adminUser: AuthenticatedUser,
    propertyId: string,
    dto: UpdatePropertyStatusDto,
  ) {
    const id = this.parseBigIntParam(propertyId, 'propertyId');
    const reviewerId = BigInt(adminUser.id);

    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException(`Property #${propertyId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({
        where: { id },
        data: {
          status: dto.status,
          reviewerId,
          reviewedAt: new Date(),
        },
        include: { partner: true },
      });

      if (dto.status === property_status_enum.active || dto.status === property_status_enum.rejected) {
        await this.createNotification(tx, {
          userId: updated.partner.userId,
          type: dto.status === property_status_enum.active ? 'property_approved' : 'property_rejected',
          title: dto.status === property_status_enum.active ? 'Khach san da duoc duyet' : 'Khach san bi tu choi',
          body: dto.status === property_status_enum.active
            ? `${updated.name} da duoc phe duyet va co the mo ban.`
            : `${updated.name} chua duoc phe duyet. Vui long kiem tra va cap nhat thong tin.`,
          entityType: 'property',
          entityId: updated.id,
          data: { propertyId: Number(updated.id), status: dto.status },
        });
      }

      return updated;
    });
  }

  private async createNotification(
    db: { $executeRaw: PrismaService['$executeRaw'] },
    notification: {
      userId: bigint;
      type: string;
      title: string;
      body?: string | null;
      data?: unknown;
      entityType?: string | null;
      entityId?: bigint | null;
    },
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
        'in_app',
        ${notification.title},
        ${notification.body ?? null},
        ${dataJson}::jsonb,
        ${notification.entityType ?? null},
        ${notification.entityId ?? null}
      )
    `;
  }

  async fetchBookingReport() {
    const properties = await this.prisma.property.findMany({
      include: {
        partner: {
          include: {
            user: true,
          },
        },
        bookings: {
          include: {
            customer: true,
            voucher: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    const report = properties.map((property) => {
      const bookingsList = property.bookings;
      const totalBookings = bookingsList.length;

      let earnedRevenue = 0;
      let pendingRevenue = 0;
      let earnedCommission = 0;
      let pendingCommission = 0;
      let earnedPartnerPayout = 0;
      let pendingPartnerPayout = 0;

      const mappedBookings = bookingsList.map((booking) => {
        const total = Number(booking.totalAmount);
        let platformFee = Number(booking.platformFeeAmount);
        if (platformFee <= 0) {
          const inferredFee = total - Number(booking.partnerPayoutAmount);
          platformFee = inferredFee > 0 ? inferredFee : 0;
        }
        const partnerPayout = Number(booking.partnerPayoutAmount);

        const isPaid = booking.paymentStatus === 'paid';
        const isCancelled = booking.status === 'cancelled';

        if (!isCancelled) {
          if (isPaid) {
            earnedRevenue += total;
            earnedCommission += platformFee;
            earnedPartnerPayout += partnerPayout;
          } else {
            pendingRevenue += total;
            pendingCommission += platformFee;
            pendingPartnerPayout += partnerPayout;
          }
        }

        const today = new Date();
        // Strip time — compare date only (Vietnam time: UTC+7)
        const todayVN = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        todayVN.setHours(0, 0, 0, 0);
        const checkInDay = new Date(booking.checkInDate);
        checkInDay.setHours(0, 0, 0, 0);
        const checkOutDay = new Date(booking.checkOutDate);
        checkOutDay.setHours(0, 0, 0, 0);

        const isCurrentStay =
          !isCancelled &&
          (booking.status === 'checked_in' ||
            (['pending', 'confirmed'].includes(booking.status) &&
              checkInDay <= todayVN &&
              checkOutDay > todayVN));
        
        const isCompleted =
          !isCancelled &&
          !isCurrentStay &&
          (booking.status === 'checked_out' || checkOutDay <= todayVN);
          
        const isFutureStay =
          !isCancelled &&
          ['pending', 'confirmed'].includes(booking.status) &&
          checkInDay > todayVN;

        return {
          id: Number(booking.id),
          bookingCode: booking.bookingCode,
          customerName: booking.customer.fullName,
          customerEmail: booking.customer.email,
          customerPhone: booking.customer.phone,
          priceLabel: booking.totalAmount.toString() + ' ' + booking.currency,
          checkInDate: booking.checkInDate.toISOString(),
          checkOutDate: booking.checkOutDate.toISOString(),
          nights: booking.numNights,
          adults: booking.numAdults,
          children: booking.numChildren,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          total,
          platformFee,
          partnerPayout,
          createdAt: booking.createdAt.toISOString(),
          specialRequests: booking.specialRequests,
          cancellationReason: booking.cancellationReason,
          isCompleted,
          isCurrentStay,
          isFutureStay,
          voucherCode: booking.voucher?.code || null,
          discountAmount: Number(booking.discountAmount) || 0,
        };
      });

      const currentStayCount = mappedBookings.filter(b => b.isCurrentStay).length;

      return {
        propertyId: Number(property.id),
        propertyName: property.name,
        city: property.city,
        address: property.address,
        partnerHotelName: property.name,
        partnerEmail: property.partner?.user?.email ?? null,
        propertyStatus: property.status,
        isArchived: !!property.deletedAt,
        archivedLabel: property.deletedAt ? 'Archived' : null,
        isActiveHotel: property.status === 'active' && !property.deletedAt,
        currentStayCount,
        totalBookings,
        earnedRevenue,
        pendingRevenue,
        earnedCommission,
        pendingCommission,
        earnedPartnerPayout,
        pendingPartnerPayout,
        bookings: mappedBookings,
      };
    });

    return { hotels: report };
  }

  async fetchBookings() {
    const bookings = await this.prisma.booking.findMany({
      include: {
        customer: true,
        roomType: {
          include: {
            property: true,
          },
        },
        voucher: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bookings.map((b) => {
      const today = new Date();
      // Strip time — compare date only (Vietnam time: UTC+7)
      const todayVN = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      todayVN.setHours(0, 0, 0, 0);
      const checkInDay = new Date(b.checkInDate);
      checkInDay.setHours(0, 0, 0, 0);
      const checkOutDay = new Date(b.checkOutDate);
      checkOutDay.setHours(0, 0, 0, 0);

      const isCancelled = b.status === 'cancelled';
      const isCurrentStay =
        !isCancelled &&
        (b.status === 'checked_in' ||
          (['pending', 'confirmed'].includes(b.status) &&
            checkInDay <= todayVN &&
            checkOutDay > todayVN));
      const isCompleted =
        !isCancelled &&
        !isCurrentStay &&
        (b.status === 'checked_out' || checkOutDay <= todayVN);
      const isFutureStay =
        !isCancelled &&
        ['pending', 'confirmed'].includes(b.status) &&
        checkInDay > todayVN;

      return {
        id: Number(b.id),
        bookingCode: b.bookingCode,
        user: b.customer
          ? {
              fullName: b.customer.fullName,
              email: b.customer.email,
              phone: b.customer.phone,
            }
          : null,
        room: b.roomType
          ? {
              name: b.roomType.name,
              property: b.roomType.property
                ? {
                    name: b.roomType.property.name,
                    status: b.roomType.property.status,
                    isArchived: !!b.roomType.property.deletedAt,
                  }
                : null,
            }
          : null,
        checkInDate: b.checkInDate.toISOString(),
        checkOutDate: b.checkOutDate.toISOString(),
        nights: b.numNights,
        adults: b.numAdults,
        children: b.numChildren,
        status: b.status,
        paymentStatus: b.paymentStatus,
        total: Number(b.totalAmount),
        platformFee: Number(b.platformFeeAmount) > 0 
          ? Number(b.platformFeeAmount) 
          : (Number(b.totalAmount) - Number(b.partnerPayoutAmount) > 0 ? Number(b.totalAmount) - Number(b.partnerPayoutAmount) : 0),
        partnerPayout: Number(b.partnerPayoutAmount),
        createdAt: b.createdAt.toISOString(),
        specialRequests: b.specialRequests,
        cancellationReason: b.cancellationReason,
        isCompleted,
        isCurrentStay,
        isFutureStay,
        voucherCode: b.voucher?.code || null,
        discountAmount: Number(b.discountAmount) || 0,
      };
    });
  }

  async markBookingPaid(adminUser: AuthenticatedUser, bookingIdStr: string) {
    const id = this.parseBigIntParam(bookingIdStr, 'bookingId');
    return this.prisma.booking.update({
      where: { id },
      data: {
        paymentStatus: 'paid',
      },
    });
  }

  async cancelBooking(adminUser: AuthenticatedUser, bookingIdStr: string) {
    const id = this.parseBigIntParam(bookingIdStr, 'bookingId');

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: { checkInDate: true, checkOutDate: true, cancellationReason: true, status: true }
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt phòng');
    }

    if (booking.status === 'cancelled' || booking.status === 'checked_out') {
      throw new BadRequestException('Đơn đặt phòng đã bị hủy hoặc đã trả phòng');
    }

    const isCheckedIn = booking.status === 'checked_in';

    return this.prisma.$transaction(async (tx) => {
      const baseReason = booking.cancellationReason?.startsWith('PENDING_CANCEL')
        ? `Yêu cầu hủy được duyệt: ${booking.cancellationReason.replace('PENDING_CANCEL:', '').trim()}`
        : 'Admin hủy đơn hàng';

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: isCheckedIn ? 'checked_out' : 'cancelled',
          cancelledById: BigInt(adminUser.id),
          cancelledAt: new Date(),
          cancellationReason: isCheckedIn
            ? `${baseReason} (Trả phòng sớm - không hoàn tiền)`
            : baseReason,
        },
      });

      // Restore availability
      const inventoryRows = await tx.$queryRaw<Array<{ ratePlanId: bigint; roomsCount: bigint }>>`
        SELECT
          rate_plan_id AS "ratePlanId",
          COUNT(*) AS "roomsCount"
        FROM booking_rooms
        WHERE booking_id = ${id}
        GROUP BY rate_plan_id
      `;

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const restoreFrom = isCheckedIn
        ? (today > booking.checkInDate ? today : booking.checkInDate)
        : booking.checkInDate;

      if (restoreFrom < booking.checkOutDate) {
        for (const row of inventoryRows) {
          await tx.$executeRaw`
            UPDATE daily_rates
            SET available_qty = available_qty + ${Number(row.roomsCount)}
            WHERE rate_plan_id = ${row.ratePlanId}
              AND date >= ${restoreFrom}
              AND date < ${booking.checkOutDate}
          `;
        }
      }

      return updatedBooking;
    });
  }

  async rejectCancelBooking(adminUser: AuthenticatedUser, bookingIdStr: string) {
    const id = this.parseBigIntParam(bookingIdStr, 'bookingId');
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: 'confirmed',
        cancellationReason: null, // Clear the PENDING_CANCEL flag
      },
    });
  }

  async getPartners(status?: string) {
    const kycFilter = status && ['pending', 'approved', 'rejected'].includes(status)
      ? status as 'pending' | 'approved' | 'rejected'
      : undefined;

    const profiles = await this.prisma.partnerProfile.findMany({
      where: kycFilter ? { kycStatus: kycFilter } : undefined,
      include: {
        user: true,
        properties: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return profiles.map((p) => ({
      id: Number(p.id),
      userId: Number(p.userId),
      email: p.user.email,
      fullName: p.user.fullName,
      phone: p.user.phone ?? null,
      hotelName: p.businessName,
      status: p.kycStatus,          // pending | approved | rejected
      userStatus: p.user.status,    // active | suspended
      rejectReason: null,
      createdAt: p.createdAt.toISOString(),
      reviewedAt: p.kycReviewedAt?.toISOString() ?? null,
      roomCount: p.properties.length,
    }));
  }

  async updatePartner(partnerProfileId: string, dto: { fullName?: string; phone?: string; businessName?: string }) {
    const id = this.parseBigIntParam(partnerProfileId, 'partnerProfileId');
    const profile = await this.prisma.partnerProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException(`PartnerProfile #${partnerProfileId} not found`);

    await this.prisma.$transaction(async (tx) => {
      if (dto.businessName) {
        await tx.partnerProfile.update({ where: { id }, data: { businessName: dto.businessName } });
      }
      if (dto.fullName !== undefined || dto.phone !== undefined) {
        await tx.user.update({
          where: { id: profile.userId },
          data: {
            ...(dto.fullName !== undefined && { fullName: dto.fullName }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
          },
        });
      }
    });

    return { success: true };
  }

  async deletePartner(partnerProfileId: string) {
    const id = this.parseBigIntParam(partnerProfileId, 'partnerProfileId');
    const profile = await this.prisma.partnerProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException(`PartnerProfile #${partnerProfileId} not found`);

    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { deletedAt: new Date(), status: 'deleted' },
    });
    return { success: true };
  }

  async lockPartner(partnerProfileId: string) {
    const id = this.parseBigIntParam(partnerProfileId, 'partnerProfileId');
    const profile = await this.prisma.partnerProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException(`PartnerProfile #${partnerProfileId} not found`);

    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { status: 'suspended' },
    });
    return { success: true };
  }

  async unlockPartner(partnerProfileId: string) {
    const id = this.parseBigIntParam(partnerProfileId, 'partnerProfileId');
    const profile = await this.prisma.partnerProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException(`PartnerProfile #${partnerProfileId} not found`);

    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { status: 'active' },
    });
    return { success: true };
  }

  async revokePartner(partnerProfileId: string) {
    const id = this.parseBigIntParam(partnerProfileId, 'partnerProfileId');
    const profile = await this.prisma.partnerProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException(`PartnerProfile #${partnerProfileId} not found`);

    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { userType: 'customer' },
    });
    return { success: true };
  }

  async getPartnerRooms(partnerProfileId: string) {
    const id = this.parseBigIntParam(partnerProfileId, 'partnerProfileId');
    const profile = await this.prisma.partnerProfile.findUnique({
      where: { id },
      include: {
        properties: {
          include: {
            media: { where: { isCover: true }, take: 1 },
            roomTypes: { select: { id: true, name: true, basePrice: true, totalRooms: true } },
          },
        },
      },
    });
    if (!profile) throw new NotFoundException(`PartnerProfile #${partnerProfileId} not found`);

    return profile.properties.map((prop) => ({
      id: Number(prop.id),
      name: prop.name,
      address: prop.address,
      city: prop.city,
      status: prop.status,
      coverImage: prop.media[0]?.url ?? null,
      roomTypes: prop.roomTypes.map((rt) => ({
        id: Number(rt.id),
        name: rt.name,
        basePrice: Number(rt.basePrice),
        totalRooms: rt.totalRooms,
      })),
    }));
  }

  private parseBigIntParam(value: string, paramName: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new NotFoundException(`${paramName} must be a positive integer`);
    }
    return BigInt(value);
  }
}
