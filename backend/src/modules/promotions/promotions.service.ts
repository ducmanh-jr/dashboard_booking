import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── LIST ───────────────────────────────────────────────────────────────────

  async findAll(filter: 'all' | 'active' | 'inactive' | 'upcoming' | 'expired' = 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Prisma.PromotionWhereInput = { deletedAt: null };

    if (filter === 'active') {
      where.isActive = true;
      where.startDate = { lte: today };
      where.endDate = { gte: today };
    } else if (filter === 'inactive') {
      where.isActive = false;
    } else if (filter === 'upcoming') {
      where.isActive = true;
      where.startDate = { gt: today };
    } else if (filter === 'expired') {
      where.endDate = { lt: today };
    }

    const promotions = await this.prisma.promotion.findMany({
      where,
      include: {
        partner: { select: { businessName: true } },
        vouchers: { select: { id: true, code: true, isActive: true, totalUsed: true, maxUsesPerUser: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return promotions.map((p) => this.mapPromotion(p));
  }

  // ─── FIND ONE ────────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id: this.toId(id), deletedAt: null },
      include: {
        partner: { select: { businessName: true } },
        vouchers: {
          select: { id: true, code: true, isActive: true, totalUsed: true, maxUsesPerUser: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!promotion) throw new NotFoundException('Không tìm thấy chương trình khuyến mãi');
    return this.mapPromotion(promotion);
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────

  async create(dto: CreatePromotionDto, admin: AuthenticatedUser) {
    const startDate = this.parseDate(dto.startDate, 'startDate');
    const endDate = this.parseDate(dto.endDate, 'endDate');

    if (endDate <= startDate) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    const promotion = await this.prisma.promotion.create({
      data: {
        name: dto.name,
        promoType: dto.promoType,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscount: dto.maxDiscount ?? null,
        minOrderAmount: dto.minOrderAmount ?? 0,
        startDate,
        endDate,
        maxUses: dto.maxUses ?? null,
        isActive: true,
        createdBy: BigInt(admin.id),
        partnerId: dto.partnerId ? BigInt(dto.partnerId) : null,
      },
      include: {
        partner: { select: { businessName: true } },
        vouchers: true,
      },
    });

    return this.mapPromotion(promotion);
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdatePromotionDto) {
    await this.findOne(id);

    const data: Prisma.PromotionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.promoType !== undefined) data.promoType = dto.promoType;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined) data.discountValue = dto.discountValue;
    if (dto.maxDiscount !== undefined) data.maxDiscount = dto.maxDiscount;
    if (dto.minOrderAmount !== undefined) data.minOrderAmount = dto.minOrderAmount;
    if (dto.maxUses !== undefined) data.maxUses = dto.maxUses;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.startDate !== undefined) {
      data.startDate = this.parseDate(dto.startDate, 'startDate');
    }
    if (dto.endDate !== undefined) {
      data.endDate = this.parseDate(dto.endDate, 'endDate');
    }

    const updated = await this.prisma.promotion.update({
      where: { id: this.toId(id) },
      data,
      include: {
        partner: { select: { businessName: true } },
        vouchers: { select: { id: true, code: true, isActive: true, totalUsed: true, maxUsesPerUser: true } },
      },
    });

    return this.mapPromotion(updated);
  }

  // ─── TOGGLE ACTIVE ───────────────────────────────────────────────────────────

  async toggle(id: string) {
    const promotion = await this.findOne(id);
    return this.update(id, { isActive: !promotion.isActive });
  }

  // ─── SOFT DELETE ─────────────────────────────────────────────────────────────

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.promotion.update({
      where: { id: this.toId(id) },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { message: 'Đã xóa chương trình khuyến mãi' };
  }

  // ─── VOUCHERS ────────────────────────────────────────────────────────────────

  async findVouchers(promotionId: string) {
    await this.findOne(promotionId);

    const vouchers = await this.prisma.voucher.findMany({
      where: { promotionId: this.toId(promotionId) },
      orderBy: { createdAt: 'desc' },
    });

    return vouchers.map((v) => ({
      id: Number(v.id),
      code: v.code,
      isActive: v.isActive,
      totalUsed: v.totalUsed,
      maxUsesPerUser: v.maxUsesPerUser,
      createdAt: v.createdAt,
    }));
  }

  async createVoucher(promotionId: string, dto: CreateVoucherDto) {
    await this.findOne(promotionId);

    const exists = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException(`Mã voucher "${dto.code}" đã tồn tại`);

    const voucher = await this.prisma.voucher.create({
      data: {
        promotionId: this.toId(promotionId),
        code: dto.code.toUpperCase(),
        maxUsesPerUser: dto.maxUsesPerUser ?? 1,
        isActive: true,
      },
    });

    return {
      id: Number(voucher.id),
      code: voucher.code,
      isActive: voucher.isActive,
      totalUsed: voucher.totalUsed,
      maxUsesPerUser: voucher.maxUsesPerUser,
      createdAt: voucher.createdAt,
    };
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private mapPromotion(p: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);

    let status: 'upcoming' | 'active' | 'expired' | 'inactive';
    if (!p.isActive) {
      status = 'inactive';
    } else if (start > today) {
      status = 'upcoming';
    } else if (end < today) {
      status = 'expired';
    } else {
      status = 'active';
    }

    return {
      id: Number(p.id),
      name: p.name,
      promoType: p.promoType,
      discountType: p.discountType,
      discountValue: Number(p.discountValue),
      maxDiscount: p.maxDiscount ? Number(p.maxDiscount) : null,
      minOrderAmount: Number(p.minOrderAmount),
      startDate: p.startDate.toISOString().slice(0, 10),
      endDate: p.endDate.toISOString().slice(0, 10),
      maxUses: p.maxUses ?? null,
      totalUsed: p.totalUsed,
      isActive: p.isActive,
      status,
      partnerName: p.partner?.businessName ?? null,
      partnerId: p.partnerId ? Number(p.partnerId) : null,
      voucherCount: p.vouchers?.length ?? 0,
      vouchers: (p.vouchers ?? []).map((v: any) => ({
        id: Number(v.id),
        code: v.code,
        isActive: v.isActive,
        totalUsed: v.totalUsed,
        maxUsesPerUser: v.maxUsesPerUser,
        createdAt: v.createdAt,
      })),
      createdAt: p.createdAt,
    };
  }

  private toId(value: string): bigint {
    if (!/^\d+$/.test(value)) throw new BadRequestException('ID không hợp lệ');
    return BigInt(value);
  }

  private parseDate(value: string, field: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} phải có định dạng YYYY-MM-DD`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (isNaN(date.getTime())) throw new BadRequestException(`${field} không hợp lệ`);
    return date;
  }
}
