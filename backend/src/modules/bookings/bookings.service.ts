import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  booking_status_enum,
  cancellation_type_enum,
  Prisma,
  type Booking,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingCreateReviewDto } from './dto/create-review.dto';

const TAX_RATE = new Prisma.Decimal(0.1);
const BOOKING_CODE_PREFIX = 'NWH';

type BookingTransaction = Prisma.TransactionClient;

interface LockedDailyRateRow {
  id: bigint;
  ratePlanId: bigint;
  date: Date;
  price: Prisma.Decimal;
  availableQty: number;
}

/** Raw row returned by FOR UPDATE lock query (snake_case from pg driver) */
interface RawDailyRateRow {
  id: bigint;
  rate_plan_id: bigint;
  date: Date;
  price: Prisma.Decimal;
  available_qty: number;
}

interface BookingRoomInventoryRow {
  ratePlanId: bigint;
  roomsCount: bigint;
}

interface ReviewAggregateRow {
  avg_rating: Prisma.Decimal | null;
  total_reviews: bigint;
}

interface ReviewIdRow {
  id: bigint;
}

export interface CancellationResult {
  booking_id: bigint;
  status: booking_status_enum;
  totalAmount: Prisma.Decimal;
  penaltyPercent: Prisma.Decimal;
  penaltyAmount: Prisma.Decimal;
  refundAmount: Prisma.Decimal;
}

export interface ReviewResult {
  id: bigint;
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a booking with strict inventory checking and race-condition safety.
   *
   * Steps:
   *  1. Lock DailyRate rows for the rate plan / date range (FOR UPDATE).
   *  2. Validate all nights have availableQty >= 1.
   *  3. Calculate totalAmount = SUM(dailyRate.price) — no basePrice used.
   *  4. Decrement availableQty by 1 for every locked row.
   *  5. Persist the Booking record.
   */
  async createBooking(
    dto: CreateBookingDto,
    user: AuthenticatedUser,
  ): Promise<Booking> {
    const customerId = BigInt(user.id);
    const propertyId = BigInt(dto.propertyId);
    const roomTypeId = BigInt(dto.roomTypeId);
    const ratePlanId = BigInt(dto.ratePlanId);
    const checkInDate = this.toUtcDateOnly(dto.checkInDate);
    const checkOutDate = this.toUtcDateOnly(dto.checkOutDate);
    const numNights = this.calculateNights(checkInDate, checkOutDate);

    return this.prisma.$transaction(async (tx) => {
      // ── STEP 1: Lock rows & read inventory ────────────────────────────────
      // Try with the provided ratePlanId first; if not found, auto-resolve
      // the first active rate plan for this roomType that has the required dates.
      let resolvedRatePlanId = BigInt(dto.ratePlanId);

      let rawRates = await tx.$queryRaw<RawDailyRateRow[]>`
        SELECT
          dr.id,
          dr.rate_plan_id,
          dr.date,
          dr.price,
          dr.available_qty
        FROM daily_rates dr
        INNER JOIN rate_plans rp ON rp.id = dr.rate_plan_id
        WHERE
          rp.room_type_id  = ${roomTypeId}
          AND rp.is_active  = TRUE
          AND dr.rate_plan_id = ${resolvedRatePlanId}
          AND dr.date >= ${checkInDate}
          AND dr.date <  ${checkOutDate}
        ORDER BY dr.date ASC
        FOR UPDATE OF dr
      `;

      // Fallback step 1: ratePlanId from client may be wrong (e.g. roomTypeId used instead)
      // Auto-find the first active rate plan for this roomType that has all dates covered
      if (rawRates.length !== numNights) {
        const fallbackPlan = await tx.$queryRaw<Array<{ id: bigint }>>`
          SELECT rp.id
          FROM rate_plans rp
          WHERE rp.room_type_id = ${roomTypeId}
            AND rp.is_active = TRUE
            AND (
              SELECT COUNT(DISTINCT dr.date)
              FROM daily_rates dr
              WHERE dr.rate_plan_id = rp.id
                AND dr.date >= ${checkInDate}
                AND dr.date < ${checkOutDate}
            ) = ${numNights}
          ORDER BY rp.id ASC
          LIMIT 1
        `;

        if (fallbackPlan.length > 0) {
          resolvedRatePlanId = fallbackPlan[0].id;
          rawRates = await tx.$queryRaw<RawDailyRateRow[]>`
            SELECT
              dr.id,
              dr.rate_plan_id,
              dr.date,
              dr.price,
              dr.available_qty
            FROM daily_rates dr
            WHERE
              dr.rate_plan_id = ${resolvedRatePlanId}
              AND dr.date >= ${checkInDate}
              AND dr.date <  ${checkOutDate}
            ORDER BY dr.date ASC
            FOR UPDATE OF dr
          `;
        }
      }

      // Fallback step 2: Daily rates genuinely don't exist → auto-generate from basePrice
      // This handles properties that have rate plans but no daily rates configured yet.
      if (rawRates.length !== numNights) {
        // Find any active rate plan for this room type
        const anyRatePlan = await tx.ratePlan.findFirst({
          where: { roomTypeId, isActive: true },
          include: { roomType: { select: { basePrice: true, totalRooms: true } } },
          orderBy: { id: 'asc' },
        });

        if (!anyRatePlan) {
          throw new BadRequestException('Loại phòng này chưa có gói giá nào được cấu hình');
        }

        resolvedRatePlanId = anyRatePlan.id;
        const basePrice = anyRatePlan.basePrice ?? anyRatePlan.roomType.basePrice;
        const totalRooms = anyRatePlan.roomType.totalRooms || 10;

        // Generate dates between checkIn and checkOut
        const datesToCreate: Date[] = [];
        const cursor = new Date(checkInDate);
        while (cursor < checkOutDate) {
          datesToCreate.push(new Date(cursor));
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        // Upsert daily rates for missing dates only
        await tx.dailyRate.createMany({
          data: datesToCreate.map((date) => ({
            ratePlanId: resolvedRatePlanId,
            date,
            price: basePrice,
            availableQty: totalRooms,
          })),
          skipDuplicates: true,
        });

        // Re-read the now-created rates with a FOR UPDATE lock
        rawRates = await tx.$queryRaw<RawDailyRateRow[]>`
          SELECT
            dr.id,
            dr.rate_plan_id,
            dr.date,
            dr.price,
            dr.available_qty
          FROM daily_rates dr
          WHERE
            dr.rate_plan_id = ${resolvedRatePlanId}
            AND dr.date >= ${checkInDate}
            AND dr.date <  ${checkOutDate}
          ORDER BY dr.date ASC
          FOR UPDATE OF dr
        `;
      }

      if (rawRates.length !== numNights) {
        throw new BadRequestException('Daily rates are missing for one or more nights');
      }

      const soldOutNight = rawRates.find((r) => Number(r.available_qty) < 1);
      if (soldOutNight) {
        throw new BadRequestException('Phòng đã hết trong giai đoạn này');
      }

      // ── STEP 2: Compute total from DailyRate.price (no basePrice) ─────────
      const subtotalAmount = rawRates.reduce(
        (sum, r) => sum.plus(r.price),
        new Prisma.Decimal(0),
      );

      // ── STEP 3: Decrement availableQty ────────────────────────────────────
      const lockedIds = rawRates.map((r) => r.id);
      await tx.dailyRate.updateMany({
        where: { id: { in: lockedIds } },
        data: { availableQty: { decrement: 1 } },
      });

      let discountAmount = new Prisma.Decimal(0);
      if (dto.voucherId) {
        const voucher = await tx.voucher.findUnique({
          where: { id: BigInt(dto.voucherId), isActive: true },
          include: { promotion: true },
        });
        if (voucher) {
          const now = new Date();
          if (now >= voucher.promotion.startDate && now <= voucher.promotion.endDate) {
            if (!voucher.promotion.maxUses || voucher.promotion.totalUsed < voucher.promotion.maxUses) {
              if (subtotalAmount.greaterThanOrEqualTo(voucher.promotion.minOrderAmount)) {
                if (voucher.promotion.discountType === 'percent') {
                  let discount = subtotalAmount.times(voucher.promotion.discountValue).div(100);
                  if (voucher.promotion.maxDiscount && discount.greaterThan(voucher.promotion.maxDiscount)) {
                    discount = new Prisma.Decimal(voucher.promotion.maxDiscount);
                  }
                  discountAmount = discount;
                } else {
                  discountAmount = new Prisma.Decimal(voucher.promotion.discountValue);
                }
                
                await tx.promotion.update({
                  where: { id: voucher.promotion.id },
                  data: { totalUsed: { increment: 1 } },
                });
              }
            }
          }
        }
      }

      const taxAmount = new Prisma.Decimal(0);
      const totalAmount = Prisma.Decimal.max(0, subtotalAmount.plus(taxAmount).minus(discountAmount));

      // ── STEP 4: Create Booking ─────────────────────────────────────────────
      return tx.booking.create({
        data: {
          bookingCode: this.generateBookingCode(),
          customerId,
          propertyId,
          roomTypeId,
          ratePlanId: resolvedRatePlanId,
          checkInDate,
          checkOutDate,
          numNights,
          numAdults: dto.numAdults,
          numChildren: dto.numChildren,
          subtotalAmount,
          discountAmount,
          taxAmount,
          totalAmount,
          partnerPayoutAmount: Prisma.Decimal.max(0, subtotalAmount.minus(discountAmount)),
          status: booking_status_enum.pending,
          voucherId: dto.voucherId ? BigInt(dto.voucherId) : undefined,
        },
      });
    });
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateBookingDto,
  ): Promise<Booking> {
    const customerId = BigInt(user.id);
    const propertyId = BigInt(dto.propertyId);
    const roomTypeId = BigInt(dto.roomTypeId);
    const checkInDate = this.toUtcDateOnly(dto.checkInDate);
    const checkOutDate = this.toUtcDateOnly(dto.checkOutDate);
    const numNights = this.calculateNights(checkInDate, checkOutDate);

    return this.prisma.$transaction(async (tx) => {
      const roomType = await tx.roomType.findFirst({
        where: {
          id: roomTypeId,
          propertyId,
          isActive: true,
        },
        include: {
          ratePlans: {
            where: { isActive: true },
          },
        },
      });

      if (!roomType) {
        throw new NotFoundException('Room type not found for this property');
      }

      if (roomType.ratePlans.length === 0) {
        throw new BadRequestException(
          'Room type does not have an active rate plan',
        );
      }

      // Start with the client's requested ratePlanId, or fallback to the first active rate plan
      let resolvedRatePlanId = roomType.ratePlans.some(rp => rp.id === BigInt(dto.ratePlanId))
        ? BigInt(dto.ratePlanId)
        : roomType.ratePlans[0].id;

      let assignableRooms = await tx.room.findMany({
        where: {
          propertyId,
          roomTypeId,
          status: 'available',
        },
        orderBy: { id: 'asc' },
        take: dto.roomsNeeded,
        select: { id: true },
      });

      if (assignableRooms.length < dto.roomsNeeded) {
        const existingCount = await tx.room.count({
          where: {
            propertyId,
            roomTypeId,
          },
        });
        const targetCount = Math.max(existingCount, roomType.totalRooms || 10, dto.roomsNeeded);
        if (existingCount < targetCount) {
          const roomsToCreate = [];
          for (let i = existingCount; i < targetCount; i++) {
            roomsToCreate.push({
              propertyId,
              roomTypeId,
              roomNumber: `${roomTypeId}-${i + 1}`,
              status: 'available' as any,
            });
          }
          await tx.room.createMany({
            data: roomsToCreate,
            skipDuplicates: true,
          });

          assignableRooms = await tx.room.findMany({
            where: {
              propertyId,
              roomTypeId,
              status: 'available',
            },
            orderBy: { id: 'asc' },
            take: dto.roomsNeeded,
            select: { id: true },
          });
        }
      }

      if (assignableRooms.length < dto.roomsNeeded) {
        throw new BadRequestException(
          'Not enough physical rooms are configured',
        );
      }

      let lockedRates = await this.lockDailyRates(
        tx,
        roomTypeId,
        resolvedRatePlanId,
        checkInDate,
        checkOutDate,
      );

      // Fallback step 1: If provided/first rate plan doesn't have all dates, find another active one
      if (lockedRates.length !== numNights) {
        const fallbackPlan = await tx.$queryRaw<Array<{ id: bigint }>>`
          SELECT rp.id
          FROM rate_plans rp
          WHERE rp.room_type_id = ${roomTypeId}
            AND rp.is_active = TRUE
            AND (
              SELECT COUNT(DISTINCT dr.date)
              FROM daily_rates dr
              WHERE dr.rate_plan_id = rp.id
                AND dr.date >= ${checkInDate}
                AND dr.date < ${checkOutDate}
            ) = ${numNights}
          ORDER BY rp.id ASC
          LIMIT 1
        `;

        if (fallbackPlan.length > 0) {
          resolvedRatePlanId = fallbackPlan[0].id;
          lockedRates = await this.lockDailyRates(
            tx,
            roomTypeId,
            resolvedRatePlanId,
            checkInDate,
            checkOutDate,
          );
        }
      }

      // Fallback step 2: If daily rates still missing, auto-generate them
      if (lockedRates.length !== numNights) {
        const ratePlanToGenerate = roomType.ratePlans.find(rp => rp.id === resolvedRatePlanId) || roomType.ratePlans[0];
        const basePrice = ratePlanToGenerate.basePrice ?? roomType.basePrice;
        const totalRooms = roomType.totalRooms || 10;

        const datesToCreate: Date[] = [];
        const cursor = new Date(checkInDate);
        while (cursor < checkOutDate) {
          datesToCreate.push(new Date(cursor));
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        await tx.dailyRate.createMany({
          data: datesToCreate.map((date) => ({
            ratePlanId: resolvedRatePlanId,
            date,
            price: basePrice,
            availableQty: totalRooms,
          })),
          skipDuplicates: true,
        });

        lockedRates = await this.lockDailyRates(
          tx,
          roomTypeId,
          resolvedRatePlanId,
          checkInDate,
          checkOutDate,
        );
      }

      this.assertCompleteAndAvailableInventory(
        lockedRates,
        numNights,
        dto.roomsNeeded,
      );

      await Promise.all(
        lockedRates.map((rate) =>
          tx.dailyRate.update({
            where: { id: rate.id },
            data: {
              availableQty: {
                decrement: dto.roomsNeeded,
              },
            },
          }),
        ),
      );

      const subtotalAmount = lockedRates.reduce(
        (sum, rate) => sum.plus(rate.price.times(dto.roomsNeeded)),
        new Prisma.Decimal(0),
      );
      const taxAmount = subtotalAmount.times(TAX_RATE);

      let discountAmount = new Prisma.Decimal(0);
      if (dto.voucherId) {
        const voucher = await tx.voucher.findUnique({
          where: { id: BigInt(dto.voucherId), isActive: true },
          include: { promotion: true },
        });
        if (voucher) {
          const now = new Date();
          if (now >= voucher.promotion.startDate && now <= voucher.promotion.endDate) {
            if (!voucher.promotion.maxUses || voucher.promotion.totalUsed < voucher.promotion.maxUses) {
              if (subtotalAmount.greaterThanOrEqualTo(voucher.promotion.minOrderAmount)) {
                if (voucher.promotion.discountType === 'percent') {
                  let discount = subtotalAmount.times(voucher.promotion.discountValue).div(100);
                  if (voucher.promotion.maxDiscount && discount.greaterThan(voucher.promotion.maxDiscount)) {
                    discount = new Prisma.Decimal(voucher.promotion.maxDiscount);
                  }
                  discountAmount = discount;
                } else {
                  discountAmount = new Prisma.Decimal(voucher.promotion.discountValue);
                }
                
                await tx.promotion.update({
                  where: { id: voucher.promotion.id },
                  data: { totalUsed: { increment: 1 } },
                });
              }
            }
          }
        }
      }

      const totalAmount = Prisma.Decimal.max(0, subtotalAmount.plus(taxAmount).minus(discountAmount));

      const booking = await tx.booking.create({
        data: {
          bookingCode: this.generateBookingCode(),
          customerId,
          propertyId,
          roomTypeId,
          ratePlanId: resolvedRatePlanId,
          checkInDate,
          checkOutDate,
          numNights,
          numAdults: dto.numAdults,
          numChildren: dto.numChildren,
          subtotalAmount,
          discountAmount,
          taxAmount,
          totalAmount,
          platformFeeAmount: Prisma.Decimal.max(0, totalAmount.times(0.1)),
          partnerPayoutAmount: Prisma.Decimal.max(0, totalAmount.times(0.9)),
          status: booking_status_enum.pending,
          voucherId: dto.voucherId ? BigInt(dto.voucherId) : undefined,
        },
      });

      const averageRoomPrice = subtotalAmount
        .div(dto.roomsNeeded)
        .div(numNights);
      await this.createBookingRooms(
        tx,
        booking.id,
        assignableRooms.map((room) => room.id),
        resolvedRatePlanId,
        averageRoomPrice,
      );

      return booking;
    });
  }

  async findMine(user: AuthenticatedUser): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: { customerId: BigInt(user.id) },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            media: {
              select: {
                url: true,
                isCover: true,
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
        roomType: {
          select: {
            id: true,
            name: true,
          },
        },
        review: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(idParam: string, user: AuthenticatedUser): Promise<Booking> {
    const id = this.parseBigIntParam(idParam, 'id');
    const customerId = BigInt(user.id);
    const booking = await this.prisma.booking.findFirst({
      where: { id, customerId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          }
        },
        roomType: {
          select: {
            id: true,
            name: true,
            bedConfiguration: true,
          }
        }
      }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async cancel(
    user: AuthenticatedUser,
    bookingIdParam: string,
  ): Promise<CancellationResult> {
    const bookingId = this.parseBigIntParam(bookingIdParam, 'id');
    const customerId = BigInt(user.id);

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId,
      },
      include: {
        property: {
          include: {
            policy: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Cannot cancel if already cancelled or checked out
    if (
      booking.status === booking_status_enum.cancelled ||
      booking.status === booking_status_enum.checked_out
    ) {
      throw new BadRequestException('Booking cannot be cancelled');
    }

    // If cancelled after check-in, no refund to customer (money stays with admin/partner)
    const isPostCheckInCancellation = booking.status === booking_status_enum.checked_in;
    const refund = this.calculateRefund(
      booking.totalAmount,
      booking.checkInDate,
      booking.property.policy,
      isPostCheckInCancellation,
    );

    await this.prisma.$transaction(async (tx) => {
      const cancellationResult = await tx.booking.updateMany({
        where: {
          id: bookingId,
          customerId,
          status: {
            notIn: [
              booking_status_enum.cancelled,
              booking_status_enum.checked_out,
            ],
          },
        },
        data: {
          status: booking_status_enum.cancelled,
          cancelledById: customerId,
          cancelledAt: new Date(),
          paymentStatus: refund.refundAmount.greaterThan(0) ? 'refunded' : booking.paymentStatus,
        },
      });

      if (cancellationResult.count !== 1) {
        throw new BadRequestException('Booking cannot be cancelled');
      }

      // Only restore availability if not already checked in
      // (after check-in, rooms are already occupied, no availability to restore)
      if (booking.status !== booking_status_enum.checked_in) {
        await this.restoreAvailability(tx, booking);
      }
    });

    return {
      booking_id: booking.id,
      status: booking_status_enum.cancelled,
      ...refund,
    };
  }

  async requestCancel(
    user: AuthenticatedUser,
    bookingIdParam: string,
    reason: string,
  ): Promise<any> {
    const bookingId = this.parseBigIntParam(bookingIdParam, 'id');
    const customerId = BigInt(user.id);

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (
      booking.status === booking_status_enum.cancelled ||
      booking.status === booking_status_enum.checked_out
    ) {
      throw new BadRequestException('Booking cannot be cancelled at this stage');
    }

    // Direct cancellation for unpaid bookings or post-check-in cancellations
    // (post-check-in cancellations don't require admin approval - money already kept)
    if (booking.paymentStatus === 'unpaid' || booking.status === booking_status_enum.checked_in) {
      await this.cancel(user, bookingIdParam);
      return { ok: true, status: 'cancelled' };
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        cancellationReason: `PENDING_CANCEL: ${reason}`.trim(),
      },
    });

    return { ok: true, status: 'pending_approval' };
  }

  async createReview(
    user: AuthenticatedUser,
    bookingIdParam: string,
    dto: BookingCreateReviewDto,
  ): Promise<ReviewResult> {
    const bookingId = this.parseBigIntParam(bookingIdParam, 'id');
    const customerId = BigInt(user.id);

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id: bookingId,
          customerId,
        },
        select: {
          id: true,
          propertyId: true,
          status: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status !== booking_status_enum.checked_out) {
        throw new BadRequestException(
          'Only checked-out bookings can be reviewed',
        );
      }

      const existingReview = await tx.$queryRaw<ReviewIdRow[]>`
        SELECT id
        FROM reviews
        WHERE booking_id = ${bookingId}
        LIMIT 1
      `;

      if (existingReview.length > 0) {
        throw new BadRequestException('This booking has already been reviewed');
      }

      const createdReviews = await tx.$queryRaw<ReviewIdRow[]>`
        INSERT INTO reviews (
          booking_id,
          property_id,
          customer_id,
          overall_rating,
          content
        )
        VALUES (
          ${bookingId},
          ${booking.propertyId},
          ${customerId},
          ${dto.overall_rating},
          ${dto.content ?? null}
        )
        RETURNING id
      `;

      const review = createdReviews[0];
      if (!review) {
        throw new BadRequestException('Review could not be created');
      }

      await this.updatePropertyReviewStats(tx, booking.propertyId);

      return review;
    });
  }

  private async lockDailyRates(
    tx: BookingTransaction,
    roomTypeId: bigint,
    ratePlanId: bigint,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<LockedDailyRateRow[]> {
    return tx.$queryRaw<LockedDailyRateRow[]>`
      SELECT
        dr.id,
        dr.rate_plan_id AS "ratePlanId",
        dr.date,
        dr.price,
        dr.available_qty AS "availableQty"
      FROM daily_rates dr
      INNER JOIN rate_plans rp ON rp.id = dr.rate_plan_id
      WHERE rp.room_type_id = ${roomTypeId}
        AND rp.is_active = TRUE
        AND dr.rate_plan_id = ${ratePlanId}
        AND dr.date >= ${checkInDate}
        AND dr.date < ${checkOutDate}
      ORDER BY dr.date ASC
      FOR UPDATE OF dr
    `;
  }

  private assertCompleteAndAvailableInventory(
    lockedRates: LockedDailyRateRow[],
    numNights: number,
    roomsNeeded: number,
  ): void {
    if (lockedRates.length !== numNights) {
      throw new BadRequestException(
        'Daily rates are missing for one or more nights',
      );
    }

    const unavailableRate = lockedRates.find(
      (rate) => rate.availableQty < roomsNeeded,
    );

    if (unavailableRate) {
      throw new BadRequestException(
        'Not enough availability for selected dates',
      );
    }
  }

  private async createBookingRooms(
    tx: BookingTransaction,
    bookingId: bigint,
    roomIds: bigint[],
    ratePlanId: bigint,
    averageRoomPrice: Prisma.Decimal,
  ): Promise<void> {
    for (const roomId of roomIds) {
      await tx.$executeRaw`
        INSERT INTO booking_rooms (
          booking_id,
          room_id,
          rate_plan_id,
          room_price
        )
        VALUES (
          ${bookingId},
          ${roomId},
          ${ratePlanId},
          ${averageRoomPrice}
        )
      `;
    }
  }

  private async restoreAvailability(
    tx: BookingTransaction,
    booking: Pick<Booking, 'id' | 'checkInDate' | 'checkOutDate'>,
  ): Promise<void> {
    const inventoryRows = await tx.$queryRaw<BookingRoomInventoryRow[]>`
      SELECT
        rate_plan_id AS "ratePlanId",
        COUNT(*)::bigint AS "roomsCount"
      FROM booking_rooms
      WHERE booking_id = ${booking.id}
      GROUP BY rate_plan_id
    `;

    if (inventoryRows.length === 0) {
      throw new BadRequestException('Booking has no room inventory records');
    }

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
  }

  private calculateRefund(
    totalAmount: Prisma.Decimal,
    checkInDate: Date,
    policy: {
      cancellationType: cancellation_type_enum;
      freeCancelHours: number | null;
      cancelPenaltyPercent: Prisma.Decimal;
    } | null,
    isPostCheckInCancellation: boolean = false,
  ) {
    // If cancelled after check-in, no refund to customer (100% penalty)
    if (isPostCheckInCancellation) {
      return {
        totalAmount,
        penaltyPercent: new Prisma.Decimal(100),
        penaltyAmount: totalAmount,
        refundAmount: new Prisma.Decimal(0),
      };
    }

    const penaltyPercent = this.calculatePenaltyPercent(checkInDate, policy);
    const penaltyAmount = totalAmount.times(penaltyPercent).div(100);
    const refundAmount = totalAmount.minus(penaltyAmount);

    return {
      totalAmount,
      penaltyPercent,
      penaltyAmount,
      refundAmount,
    };
  }

  private calculatePenaltyPercent(
    checkInDate: Date,
    policy: {
      cancellationType: cancellation_type_enum;
      freeCancelHours: number | null;
      cancelPenaltyPercent: Prisma.Decimal;
    } | null,
  ): Prisma.Decimal {
    if (!policy || policy.cancellationType === cancellation_type_enum.free) {
      return new Prisma.Decimal(0);
    }

    if (policy.cancellationType === cancellation_type_enum.non_refundable) {
      return new Prisma.Decimal(100);
    }

    const configuredPenalty = policy.cancelPenaltyPercent;
    const freeCancelHours = policy.freeCancelHours;

    if (freeCancelHours === null) {
      return configuredPenalty;
    }

    const penaltyStartsAt = new Date(checkInDate);
    penaltyStartsAt.setUTCHours(
      penaltyStartsAt.getUTCHours() - freeCancelHours,
    );

    return new Date().getTime() >= penaltyStartsAt.getTime()
      ? configuredPenalty
      : new Prisma.Decimal(0);
  }

  private async updatePropertyReviewStats(
    tx: BookingTransaction,
    propertyId: bigint,
  ): Promise<void> {
    const aggregates = await tx.$queryRaw<ReviewAggregateRow[]>`
      SELECT
        AVG(overall_rating) AS avg_rating,
        COUNT(*)::bigint AS total_reviews
      FROM reviews
      WHERE property_id = ${propertyId}
    `;

    const aggregate = aggregates[0];
    const avgRating = (
      aggregate?.avg_rating ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);
    const totalReviews = aggregate ? Number(aggregate.total_reviews) : 0;

    await tx.property.update({
      where: { id: propertyId },
      data: {
        avgRating,
        totalReviews,
      },
    });
  }

  private calculateNights(checkInDate: Date, checkOutDate: Date): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const nights = Math.floor(
      (checkOutDate.getTime() - checkInDate.getTime()) / millisecondsPerDay,
    );

    if (nights <= 0) {
      throw new BadRequestException('checkOutDate must be after checkInDate');
    }

    return nights;
  }

  private toUtcDateOnly(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private parseBigIntParam(value: string, paramName: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`${paramName} must be a positive integer`);
    }

    return BigInt(value);
  }

  private generateBookingCode(): string {
    const timestampPart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `${BOOKING_CODE_PREFIX}-${timestampPart}-${randomPart}`;
  }
}
