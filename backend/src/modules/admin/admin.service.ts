import { Injectable, NotFoundException } from '@nestjs/common';

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

    return this.prisma.partnerProfile.update({
      where: { id },
      data: {
        kycStatus: dto.status,
        kycReviewerId: reviewerId,
        kycReviewedAt: new Date(),
      },
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

    return this.prisma.property.update({
      where: { id },
      data: {
        status: dto.status,
        reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  private parseBigIntParam(value: string, paramName: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new NotFoundException(`${paramName} must be a positive integer`);
    }
    return BigInt(value);
  }
}