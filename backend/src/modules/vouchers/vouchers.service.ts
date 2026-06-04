import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  async applyVoucher(code: string, propertyId: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code, isActive: true },
      include: {
        promotion: true,
      },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found or inactive');
    }

    if (voucher.promotion.partnerId) {
      if (!propertyId || propertyId === 'undefined' || propertyId === 'null') {
        throw new BadRequestException('Voucher is not valid for this property');
      }

      let parsedPropId: bigint;
      try {
        parsedPropId = BigInt(propertyId);
      } catch (err) {
        throw new BadRequestException('Invalid property ID format');
      }

      const prop = await this.prisma.property.findUnique({
        where: { id: parsedPropId },
        select: { partnerId: true },
      });

      if (!prop || voucher.promotion.partnerId !== prop.partnerId) {
        throw new BadRequestException('Voucher is not valid for this property');
      }
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (today < voucher.promotion.startDate || today > voucher.promotion.endDate) {
      throw new BadRequestException('Voucher is expired or not yet active');
    }

    if (voucher.promotion.maxUses && voucher.promotion.totalUsed >= voucher.promotion.maxUses) {
      throw new BadRequestException('Voucher usage limit reached');
    }

    return {
      id: voucher.id.toString(),
      code: voucher.code,
      discountType: voucher.promotion.discountType,
      discountValue: Number(voucher.promotion.discountValue),
      maxDiscount: voucher.promotion.maxDiscount ? Number(voucher.promotion.maxDiscount) : null,
      minOrderAmount: Number(voucher.promotion.minOrderAmount),
    };
  }

  async getActiveVouchers(propertyId?: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    let partnerId: bigint | null = null;
    if (propertyId && propertyId !== 'undefined' && propertyId !== 'null') {
      try {
        const parsedPropId = BigInt(propertyId);
        const prop = await this.prisma.property.findUnique({
          where: { id: parsedPropId },
          select: { partnerId: true },
        });
        if (prop) {
          partnerId = prop.partnerId;
        }
      } catch (err) {
        // Fallback in case propertyId was directly partnerId or invalid
        try {
          partnerId = BigInt(propertyId);
        } catch {
          // ignore
        }
      }
    }

    const vouchers = await this.prisma.voucher.findMany({
      where: {
        isActive: true,
        promotion: {
          isActive: true,
          startDate: { lte: today },
          endDate: { gte: today },
          OR: partnerId
            ? [
                { partnerId: partnerId },
                { partnerId: null }
              ]
            : [
                { partnerId: null }
              ]
        }
      },
      include: {
        promotion: true,
      },
    });

    return vouchers.map(v => ({
      id: v.id.toString(),
      code: v.code,
      name: v.promotion.name,
      discountType: v.promotion.discountType,
      discountValue: Number(v.promotion.discountValue),
      maxDiscount: v.promotion.maxDiscount ? Number(v.promotion.maxDiscount) : null,
      minOrderAmount: Number(v.promotion.minOrderAmount),
      startDate: v.promotion.startDate,
      endDate: v.promotion.endDate,
    }));
  }
}

