import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CustomerCreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(
    user: AuthenticatedUser,
    bookingId: string,
    dto: CustomerCreateReviewDto,
  ) {
    const customerId = BigInt(user.id);
    const bookingBigInt = this.parseBigIntParam(bookingId, 'bookingId');

    // Validation 1 & 2: fetch booking, check ownership and status
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingBigInt },
      select: {
        id: true,
        customerId: true,
        propertyId: true,
        status: true,
        review: { select: { id: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking #${bookingId} not found`);
    }

    if (booking.customerId !== customerId) {
      throw new ForbiddenException('Booking does not belong to you');
    }

    if (booking.status !== 'checked_out') {
      throw new BadRequestException(
        'You can only leave a review after completing your stay (status: checked_out)',
      );
    }

    // Validation 3: no duplicate review
    if (booking.review) {
      throw new ConflictException('A review for this booking already exists');
    }

    const propertyId = booking.propertyId;
    const overallRating = new Prisma.Decimal(dto.rating);

    return this.prisma.$transaction(async (tx) => {
      // Step 1: create Review
      const review = await tx.review.create({
        data: {
          bookingId: bookingBigInt,
          propertyId,
          customerId,
          overallRating,
          content: dto.comment ?? null,
        },
      });

      // Step 2: fetch current property stats (inside transaction for consistency)
      const property = await tx.property.findUniqueOrThrow({
        where: { id: propertyId },
        select: { avgRating: true, totalReviews: true },
      });

      const oldAvgRating = property.avgRating;
      const oldTotalReviews = property.totalReviews;
      const newTotalReviews = oldTotalReviews + 1;

      // Formula: ((oldAvgRating * oldTotalReviews) + newRating) / (oldTotalReviews + 1)
      const newAvgRating = oldAvgRating
        .mul(new Prisma.Decimal(oldTotalReviews))
        .add(overallRating)
        .div(new Prisma.Decimal(newTotalReviews))
        .toDecimalPlaces(2);

      // Step 3: atomically update Property stats
      await tx.property.update({
        where: { id: propertyId },
        data: {
          totalReviews: newTotalReviews,
          avgRating: newAvgRating,
        },
      });

      return review;
    });
  }

  async findByProperty(propertyIdParam: string) {
    const propertyId = this.parseBigIntParam(propertyIdParam, 'propertyId');
    return this.prisma.review.findMany({
      where: { propertyId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private parseBigIntParam(value: string, paramName: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`${paramName} must be a positive integer`);
    }
    return BigInt(value);
  }
}
