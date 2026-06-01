import { Injectable, NotFoundException } from '@nestjs/common';
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

  private parseBigIntParam(value: string, paramName: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new NotFoundException(`${paramName} must be a positive integer`);
    }
    return BigInt(value);
  }
}
