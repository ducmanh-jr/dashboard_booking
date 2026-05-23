import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { booking_status_enum } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

const PAYMENT_TIMEOUT_MINUTES = 15;
const CANCELLATION_REASON = 'PAYMENT_TIMEOUT';

@Injectable()
export class BookingsCron {
  private readonly logger = new Logger(BookingsCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs every minute.
   * Finds pending bookings older than 15 minutes, cancels them and restores inventory.
  */
  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredInventory(): Promise<void> {
    if (process.env.BOOKING_CRON_ENABLED !== 'true') {
      return;
    }

    const cutoff = new Date(
      Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000,
    );

    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: booking_status_enum.pending,
        createdAt: { lt: cutoff },
      },
      select: {
        id: true,
        ratePlanId: true,
        checkInDate: true,
        checkOutDate: true,
      },
    });

    if (expiredBookings.length === 0) {
      return;
    }

    this.logger.log(
      `Releasing inventory for ${expiredBookings.length} expired booking(s)`,
    );

    await this.prisma.$transaction(async (tx) => {
      for (const booking of expiredBookings) {
        // Cancel the booking
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: booking_status_enum.cancelled,
            cancellationReason: CANCELLATION_REASON,
            cancelledAt: new Date(),
          },
        });

        // Restore DailyRate inventory: increment availableQty by 1 for every
        // night in the original stay range.
        await tx.dailyRate.updateMany({
          where: {
            ratePlanId: booking.ratePlanId,
            date: {
              gte: booking.checkInDate,
              lt: booking.checkOutDate,
            },
          },
          data: {
            availableQty: { increment: 1 },
          },
        });

        this.logger.debug(
          `Booking ${booking.id} cancelled — inventory restored for ` +
            `ratePlan ${booking.ratePlanId} (${booking.checkInDate.toISOString().slice(0, 10)} → ${booking.checkOutDate.toISOString().slice(0, 10)})`,
        );
      }
    });
  }
}
