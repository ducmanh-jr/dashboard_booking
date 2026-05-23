import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  cancellation_type_enum,
  discount_type_enum,
  no_show_penalty_type_enum,
  parking_type_enum,
  property_status_enum,
  Prisma,
  RoomType,
  user_type_enum,
} from '@prisma/client';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { GenerateDailyRatesDto } from './dto/generate-daily-rates.dto';
import { UpdatePropertyAmenitiesDto } from './dto/update-property-amenities.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { UpsertPropertyPoliciesDto } from './dto/upsert-property-policies.dto';

const MAX_DAILY_RATE_DAYS = 90;
const DEFAULT_RATE_PLAN_NAME = 'Standard Rate';

interface PolicyWriteData {
  cancellationType?: cancellation_type_enum;
  freeCancelHours?: number;
  cancelPenaltyPercent?: number;
  minStayNights?: number;
  maxStayNights?: number;
  checkInFrom?: Date;
  checkInUntil?: Date;
  checkOutFrom?: Date;
  checkOutUntil?: Date;
  earlyCheckInAllowed?: boolean;
  earlyCheckInFee?: number;
  lateCheckOutAllowed?: boolean;
  lateCheckOutFee?: number;
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  childrenAllowed?: boolean;
  noShowPenaltyType?: no_show_penalty_type_enum;
  instantConfirmation?: boolean;
  depositRequired?: boolean;
  depositType?: discount_type_enum;
  depositValue?: number;
  acceptedPaymentMethods?: Prisma.InputJsonValue;
  breakfastIncluded?: boolean;
  parkingType?: parking_type_enum;
  partiesAllowed?: boolean;
  quietHoursStart?: Date;
  quietHoursEnd?: Date;
  customRules?: string;
}

type PolicyTimeKey = {
  [TKey in keyof PolicyWriteData]-?: PolicyWriteData[TKey] extends Date | undefined
    ? TKey
    : never;
}[keyof PolicyWriteData];

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async createProperty(user: AuthenticatedUser, dto: CreatePropertyDto) {
    const partnerProfile = await this.getPartnerProfile(user);
    const slug = await this.generateUniquePropertySlug(dto.name);

    return this.prisma.property.create({
      data: {
        partnerId: partnerProfile.id,
        slug,
        name: dto.name,
        propertyType: dto.propertyType,
        city: dto.city,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        description: dto.description,
        status: property_status_enum.draft,
      },
    });
  }

  async updateProperty(
    user: AuthenticatedUser,
    propertyId: bigint,
    dto: UpdatePropertyDto,
  ) {
    await this.assertPropertyOwnership(user, propertyId);

    const data: Prisma.PropertyUpdateInput = {};

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (dto.check_in_time !== undefined) {
      data.checkInTime = this.parseTime(dto.check_in_time);
    }

    if (dto.check_out_time !== undefined) {
      data.checkOutTime = this.parseTime(dto.check_out_time);
    }

    return this.prisma.property.update({
      where: { id: propertyId },
      data,
    });
  }

  async upsertPropertyPolicies(
    user: AuthenticatedUser,
    propertyId: bigint,
    dto: UpsertPropertyPoliciesDto,
  ) {
    await this.assertPropertyOwnership(user, propertyId);

    const writeData = this.buildPolicyWriteData(dto);

    return this.prisma.propertyPolicy.upsert({
      where: { propertyId },
      create: {
        propertyId,
        ...writeData,
      },
      update: writeData,
    });
  }

  async updatePropertyAmenities(
    user: AuthenticatedUser,
    propertyId: bigint,
    dto: UpdatePropertyAmenitiesDto,
  ) {
    await this.assertPropertyOwnership(user, propertyId);

    const amenityIds = [...new Set(dto.amenity_ids.map((id) => BigInt(id)))];
    const existingAmenities = await this.prisma.amenity.findMany({
      where: {
        id: { in: amenityIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (existingAmenities.length !== amenityIds.length) {
      throw new BadRequestException('One or more amenities are invalid');
    }

    await this.prisma.$transaction([
      this.prisma.propertyAmenity.deleteMany({
        where: { propertyId },
      }),
      this.prisma.propertyAmenity.createMany({
        data: amenityIds.map((amenityId) => ({
          propertyId,
          amenityId,
        })),
        skipDuplicates: true,
      }),
    ]);

    return this.prisma.propertyAmenity.findMany({
      where: { propertyId },
      include: { amenity: true },
    });
  }

  async createRoomType(
    user: AuthenticatedUser,
    propertyId: bigint,
    dto: CreateRoomTypeDto,
  ): Promise<RoomType> {
    await this.assertPropertyOwnership(user, propertyId);

    return this.prisma.$transaction(async (tx) => {
      const roomType = await tx.roomType.create({
        data: {
          propertyId,
          name: dto.name,
          description: dto.description,
          areaSqm: dto.areaSqm,
          maxOccupancy: dto.maxOccupancy,
          basePrice: dto.basePrice,
          totalRooms: dto.totalRooms,
        },
      });

      await tx.ratePlan.create({
        data: {
          roomTypeId: roomType.id,
          name: DEFAULT_RATE_PLAN_NAME,
          mealPlan: 'room_only',
          basePrice: dto.basePrice,
          refundable: true,
          isActive: true,
        },
      });

      return roomType;
    });
  }

  async generateDailyRates(
    user: AuthenticatedUser,
    roomTypeId: bigint,
    dto: GenerateDailyRatesDto,
  ) {
    this.validateDailyRateRange(dto.startDate, dto.endDate);

    const ratePlan = await this.assertRatePlanOwnership(
      user,
      roomTypeId,
      BigInt(dto.ratePlanId),
    );
    const dates = this.enumerateDates(dto.startDate, dto.endDate);

    const result = await this.prisma.dailyRate.createMany({
      data: dates.map((date) => ({
        ratePlanId: ratePlan.id,
        date,
        price: ratePlan.roomType.basePrice,
        availableQty: ratePlan.roomType.totalRooms,
      })),
      skipDuplicates: true,
    });

    return {
      roomTypeId: ratePlan.roomType.id,
      ratePlanId: ratePlan.id,
      requestedDates: dates.length,
      insertedCount: result.count,
    };
  }

  parseBigIntParam(value: string, paramName: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`${paramName} must be a positive integer`);
    }

    return BigInt(value);
  }

  private async getPartnerProfile(user: AuthenticatedUser) {
    if (user.userType !== user_type_enum.partner) {
      throw new ForbiddenException('Partner role is required');
    }

    const partnerProfile = await this.prisma.partnerProfile.findUnique({
      where: { userId: BigInt(user.id) },
      select: { id: true },
    });

    if (!partnerProfile) {
      throw new ForbiddenException('Partner profile was not found');
    }

    return partnerProfile;
  }

  private async assertPropertyOwnership(
    user: AuthenticatedUser,
    propertyId: bigint,
  ) {
    const partnerProfile = await this.getPartnerProfile(user);
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, partnerId: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.partnerId !== partnerProfile.id) {
      throw new ForbiddenException('You do not own this property');
    }

    return property;
  }

  private async assertRoomTypeOwnership(
    user: AuthenticatedUser,
    roomTypeId: bigint,
  ) {
    const partnerProfile = await this.getPartnerProfile(user);
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: {
        property: {
          select: { partnerId: true },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    if (roomType.property.partnerId !== partnerProfile.id) {
      throw new ForbiddenException('You do not own this room type');
    }

    return roomType;
  }

  private async assertRatePlanOwnership(
    user: AuthenticatedUser,
    roomTypeId: bigint,
    ratePlanId: bigint,
  ) {
    const partnerProfile = await this.getPartnerProfile(user);
    const ratePlan = await this.prisma.ratePlan.findUnique({
      where: { id: ratePlanId },
      include: {
        roomType: {
          include: {
            property: {
              select: { id: true, partnerId: true },
            },
          },
        },
      },
    });

    if (!ratePlan) {
      throw new NotFoundException('Rate plan not found');
    }

    if (
      ratePlan.roomTypeId !== roomTypeId ||
      ratePlan.roomType.property.partnerId !== partnerProfile.id
    ) {
      throw new ForbiddenException('You do not own this rate plan');
    }

    return ratePlan;
  }

  private async ensureDefaultRatePlan(roomType: RoomType) {
    const existingRatePlan = await this.prisma.ratePlan.findFirst({
      where: {
        roomTypeId: roomType.id,
        name: DEFAULT_RATE_PLAN_NAME,
      },
      orderBy: { id: 'asc' },
    });

    if (existingRatePlan) {
      return existingRatePlan;
    }

    return this.prisma.ratePlan.create({
      data: {
        roomTypeId: roomType.id,
        name: DEFAULT_RATE_PLAN_NAME,
        basePrice: roomType.basePrice,
        refundable: true,
        isActive: true,
      },
    });
  }

  private validateDailyRateRange(startDate: Date, endDate: Date): void {
    const start = this.toUtcDateOnly(startDate);
    const end = this.toUtcDateOnly(endDate);
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor(
      (end.getTime() - start.getTime()) / millisecondsPerDay,
    );
    const inclusiveDays = diffDays + 1;

    if (diffDays < 0) {
      throw new BadRequestException('endDate must be after or equal startDate');
    }

    if (inclusiveDays > MAX_DAILY_RATE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_DAILY_RATE_DAYS} days`,
      );
    }
  }

  private enumerateDates(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const cursor = this.toUtcDateOnly(startDate);
    const end = this.toUtcDateOnly(endDate);

    while (cursor.getTime() <= end.getTime()) {
      dates.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dates;
  }

  private toUtcDateOnly(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private buildPolicyWriteData(
    dto: UpsertPropertyPoliciesDto,
  ): PolicyWriteData {
    const data: PolicyWriteData = {};

    this.assignIfDefined(data, 'cancellationType', dto.cancellation_type);
    this.assignIfDefined(data, 'freeCancelHours', dto.free_cancel_hours);
    this.assignIfDefined(
      data,
      'cancelPenaltyPercent',
      dto.cancel_penalty_percent,
    );
    this.assignIfDefined(data, 'minStayNights', dto.min_stay_nights);
    this.assignIfDefined(data, 'maxStayNights', dto.max_stay_nights);
    this.assignTimeIfDefined(data, 'checkInFrom', dto.check_in_from);
    this.assignTimeIfDefined(data, 'checkInUntil', dto.check_in_until);
    this.assignTimeIfDefined(data, 'checkOutFrom', dto.check_out_from);
    this.assignTimeIfDefined(data, 'checkOutUntil', dto.check_out_until);
    this.assignIfDefined(
      data,
      'earlyCheckInAllowed',
      dto.early_check_in_allowed,
    );
    this.assignIfDefined(data, 'earlyCheckInFee', dto.early_check_in_fee);
    this.assignIfDefined(
      data,
      'lateCheckOutAllowed',
      dto.late_check_out_allowed,
    );
    this.assignIfDefined(data, 'lateCheckOutFee', dto.late_check_out_fee);
    this.assignIfDefined(data, 'petsAllowed', dto.pets_allowed);
    this.assignIfDefined(data, 'smokingAllowed', dto.smoking_allowed);
    this.assignIfDefined(data, 'childrenAllowed', dto.children_allowed);
    this.assignIfDefined(data, 'noShowPenaltyType', dto.no_show_penalty_type);
    this.assignIfDefined(data, 'instantConfirmation', dto.instant_confirmation);
    this.assignIfDefined(data, 'depositRequired', dto.deposit_required);
    this.assignIfDefined(data, 'depositType', dto.deposit_type);
    this.assignIfDefined(data, 'depositValue', dto.deposit_value);
    this.assignIfDefined(data, 'breakfastIncluded', dto.breakfast_included);
    this.assignIfDefined(data, 'parkingType', dto.parking_type);
    this.assignIfDefined(data, 'partiesAllowed', dto.parties_allowed);
    this.assignTimeIfDefined(data, 'quietHoursStart', dto.quiet_hours_start);
    this.assignTimeIfDefined(data, 'quietHoursEnd', dto.quiet_hours_end);
    this.assignIfDefined(data, 'customRules', dto.custom_rules);

    const paymentMethods = dto.toPrismaJsonPaymentMethods();
    if (paymentMethods !== undefined) {
      data.acceptedPaymentMethods = paymentMethods;
    }

    return data;
  }

  private assignIfDefined<TKey extends keyof PolicyWriteData>(
    data: PolicyWriteData,
    key: TKey,
    value: PolicyWriteData[TKey] | undefined,
  ): void {
    if (value !== undefined) {
      data[key] = value;
    }
  }

  private assignTimeIfDefined(
    data: PolicyWriteData,
    key: PolicyTimeKey,
    value: string | undefined,
  ): void {
    if (value !== undefined) {
      data[key] = this.parseTime(value);
    }
  }

  private parseTime(value: string): Date {
    const normalizedValue = value.length === 5 ? `${value}:00` : value;

    return new Date(`1970-01-01T${normalizedValue}.000Z`);
  }

  private async generateUniquePropertySlug(name: string): Promise<string> {
    const baseSlug = this.slugify(name);
    let candidate = baseSlug;
    let suffix = 1;

    while (
      await this.prisma.property.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })
    ) {
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }

    return candidate;
  }

  private slugify(value: string): string {
    const slug = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 240);

    return slug || `property-${Date.now()}`;
  }
}
