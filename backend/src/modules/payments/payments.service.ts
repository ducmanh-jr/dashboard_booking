import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { WebhookDto } from './dto/webhook.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(bookingId: string, userId: string) {
    const id = BigInt(bookingId);
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    if (booking.customerId !== BigInt(userId)) {
      throw new ForbiddenException('Booking does not belong to you.');
    }
    if (booking.status !== $Enums.booking_status_enum.pending) {
      throw new BadRequestException('Booking is not in pending status.');
    }

    return { checkoutUrl: 'https://mock-gateway.com/pay?ref=' + booking.bookingCode };
  }

  async processPayment(bookingId: string, userId: string) {
    const id = BigInt(bookingId);
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    if (booking.customerId !== BigInt(userId)) {
      throw new ForbiddenException('Booking does not belong to you.');
    }
    if (booking.status !== $Enums.booking_status_enum.pending) {
      throw new BadRequestException('Booking is not in pending status.');
    }

    // Simulate successful payment
    await this.prisma.booking.update({
      where: { id },
      data: {
        status: $Enums.booking_status_enum.confirmed,
        paymentStatus: $Enums.payment_status_enum.paid,
      },
    });

    return { success: true };
  }

  async handleWebhook(dto: WebhookDto) {
    await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { bookingCode: dto.bookingCode },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found.');
      }

      // Idempotency: already confirmed
      if (booking.status === $Enums.booking_status_enum.confirmed) {
        return;
      }

      // Race condition: cronjob cancelled before webhook arrived
      if (booking.status === $Enums.booking_status_enum.cancelled) {
        await tx.auditLog.create({
          data: {
            actorId: booking.customerId,
            action: 'REQUIRE_REFUND',
            entityType: 'booking',
            entityId: booking.id,
            newValues: { reason: 'Webhook arrived after cronjob cancellation' },
          },
        });
        return;
      }

      // Success path
      if (
        booking.status === $Enums.booking_status_enum.pending &&
        dto.transactionStatus === 'SUCCESS'
      ) {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: $Enums.booking_status_enum.confirmed,
            paymentStatus: $Enums.payment_status_enum.paid,
          },
        });
      }
    });

    return { received: true };
  }
}