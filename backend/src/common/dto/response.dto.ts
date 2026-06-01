import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  booking_status_enum,
  cancellation_type_enum,
  device_type_enum,
  discount_type_enum,
  kyc_status_enum,
  media_category_enum,
  media_type_enum,
  moderation_status_enum,
  no_show_penalty_type_enum,
  parking_type_enum,
  payment_status_enum,
  Prisma,
  property_status_enum,
  property_type_enum,
  source_channel_enum,
  user_status_enum,
  user_type_enum,
} from '@prisma/client';

type DecimalLike = Prisma.Decimal | number | string;

type UserResponseSource = {
  id: bigint;
  uuid: string;
  email: string;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  userType: user_type_enum;
  status: user_status_enum;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  preferredLanguage: string;
  createdAt: Date;
  updatedAt: Date;
};

type AuthUserSummarySource = {
  id: bigint;
  email: string;
  userType: user_type_enum;
};

type TokenPairSource = {
  accessToken: string;
  refreshToken: string;
};

type LoginResponseSource = TokenPairSource & {
  user: AuthUserSummarySource;
};

type PropertySource = {
  id: bigint;
  partnerId?: bigint;
  slug: string;
  name: string;
  propertyType: property_type_enum;
  description: string | null;
  address: string;
  city: string;
  district: string | null;
  countryCode: string;
  latitude: DecimalLike;
  longitude: DecimalLike;
  starRating: number | null;
  avgRating: DecimalLike;
  totalReviews: number;
  checkInTime: Date;
  checkOutTime: Date;
  status: property_status_enum;
  reviewerId?: bigint | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PartnerKycSource = {
  id: bigint;
  userId: bigint;
  businessName: string;
  businessType: string;
  kycStatus: kyc_status_enum;
  kycReviewerId: bigint | null;
  kycReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PropertyPolicySource = {
  id: bigint;
  propertyId: bigint;
  cancellationType: cancellation_type_enum;
  freeCancelHours: number | null;
  cancelPenaltyPercent: DecimalLike;
  minStayNights: number;
  maxStayNights: number | null;
  checkInFrom: Date;
  checkInUntil: Date;
  checkOutFrom: Date | null;
  checkOutUntil: Date;
  earlyCheckInAllowed: boolean;
  earlyCheckInFee: DecimalLike | null;
  lateCheckOutAllowed: boolean;
  lateCheckOutFee: DecimalLike | null;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  childrenAllowed: boolean;
  noShowPenaltyType: no_show_penalty_type_enum;
  instantConfirmation: boolean;
  depositRequired: boolean;
  depositType: discount_type_enum | null;
  depositValue: DecimalLike | null;
  breakfastIncluded: boolean;
  parkingType: parking_type_enum;
  partiesAllowed: boolean;
  quietHoursStart: Date | null;
  quietHoursEnd: Date | null;
  customRules: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AmenitySource = {
  id: bigint;
  name: string;
  category: string;
  iconCode: string | null;
};

type PropertyAmenitySource = {
  propertyId: bigint;
  amenityId: bigint;
  amenity?: AmenitySource;
};

type RoomTypeSource = {
  id: bigint;
  propertyId: bigint;
  name: string;
  description: string | null;
  areaSqm: DecimalLike | null;
  bedConfiguration?: string | null;
  maxOccupancy: number;
  viewType?: string | null;
  totalRooms: number;
  basePrice: DecimalLike;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  total_price?: number | null;
  min_available_qty?: number | null;
  media?: MediaSource[];
  amenities?: RoomTypeAmenitySource[];
};

type MediaSource = {
  id: bigint;
  mediaType: media_type_enum;
  category: media_category_enum;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  isCover: boolean;
  sortOrder: number;
  createdAt: Date;
};

type RoomTypeAmenitySource = {
  amenityId: bigint;
  amenity: AmenitySource;
};

type ReviewSource = {
  id: bigint;
  bookingId: bigint;
  propertyId: bigint;
  customerId: bigint;
  overallRating: DecimalLike;
  content: string | null;
  moderationStatus: moderation_status_enum;
  createdAt: Date;
  updatedAt: Date;
};

type BookingSource = {
  id: bigint;
  bookingCode: string;
  customerId: bigint;
  propertyId: bigint;
  roomTypeId: bigint;
  ratePlanId: bigint;
  checkInDate: Date;
  checkOutDate: Date;
  numNights: number;
  numAdults: number;
  numChildren: number;
  subtotalAmount: DecimalLike;
  discountAmount: DecimalLike;
  taxAmount: DecimalLike;
  totalAmount: DecimalLike;
  currency: string;
  status: booking_status_enum;
  paymentStatus: payment_status_enum;
  sourceChannel: source_channel_enum;
  specialRequests: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  property?: {
    id: bigint;
    name: string;
    city: string;
    address: string;
  };
};

type CancellationSource = {
  booking_id: bigint;
  status: booking_status_enum;
  totalAmount: DecimalLike;
  penaltyPercent: DecimalLike;
  penaltyAmount: DecimalLike;
  refundAmount: DecimalLike;
};

type ReviewIdSource = {
  id: bigint;
};

type PropertySearchItemSource = {
  id: string;
  slug: string;
  name: string;
  property_type: string;
  address: string;
  city: string;
  district: string | null;
  country_code: string;
  latitude: number;
  longitude: number;
  star_rating: number | null;
  avg_rating: number;
  total_reviews: number;
  min_nightly_price: number;
  min_total_price: number | null;
  cover_image: string | null;
};

type PropertySearchSource = {
  items: PropertySearchItemSource[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

type PropertyDetailSource = PropertySource & {
  media: MediaSource[];
  amenities: PropertyAmenitySource[];
  policy: PropertyPolicySource | null;
  roomTypes: RoomTypeSource[];
};

const toId = (value: bigint): string => value.toString();
const toNumber = (value: DecimalLike): number => Number(value);
const toIso = (value: Date): string => value.toISOString();
const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const toTime = (value: Date): string => value.toISOString().slice(11, 19);

export class UserResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '8df77395-c5ff-48f5-80a0-676d7bbf8d52' })
  uuid!: string;

  @ApiProperty({ example: 'customer@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: '+84901234567', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ enum: user_type_enum })
  userType!: user_type_enum;

  @ApiProperty({ enum: user_status_enum })
  status!: user_status_enum;

  @ApiPropertyOptional({ nullable: true })
  emailVerifiedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastLoginAt!: string | null;

  @ApiProperty({ example: 'vi' })
  preferredLanguage!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static from(source: UserResponseSource): UserResponseDto {
    return Object.assign(new UserResponseDto(), {
      id: toId(source.id),
      uuid: source.uuid,
      email: source.email,
      phone: source.phone,
      fullName: source.fullName,
      avatarUrl: source.avatarUrl,
      userType: source.userType,
      status: source.status,
      emailVerifiedAt: source.emailVerifiedAt
        ? toIso(source.emailVerifiedAt)
        : null,
      lastLoginAt: source.lastLoginAt ? toIso(source.lastLoginAt) : null,
      preferredLanguage: source.preferredLanguage,
      createdAt: toIso(source.createdAt),
      updatedAt: toIso(source.updatedAt),
    });
  }
}

export class AuthUserSummaryResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'customer@example.com' })
  email!: string;

  @ApiProperty({ enum: user_type_enum })
  userType!: user_type_enum;

  @ApiProperty({ enum: user_type_enum, description: 'Alias of userType for frontend compat' })
  role!: user_type_enum;

  static from(source: AuthUserSummarySource): AuthUserSummaryResponseDto {
    return Object.assign(new AuthUserSummaryResponseDto(), {
      id: toId(source.id),
      email: source.email,
      userType: source.userType,
      role: source.userType,
    });
  }
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AuthUserSummaryResponseDto })
  user!: AuthUserSummaryResponseDto;

  static from(source: LoginResponseSource): LoginResponseDto {
    return Object.assign(new LoginResponseDto(), {
      accessToken: source.accessToken,
      refreshToken: source.refreshToken,
      user: AuthUserSummaryResponseDto.from(source.user),
    });
  }
}

export class RefreshResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  static from(source: TokenPairSource): RefreshResponseDto {
    return Object.assign(new RefreshResponseDto(), source);
  }
}

export class LogoutResponseDto {
  @ApiProperty({ example: 200 })
  statusCode!: 200;

  @ApiProperty({ example: 'Logged out successfully' })
  message!: string;

  @ApiProperty({
    type: 'object',
    nullable: true,
    example: null,
    additionalProperties: false,
  })
  data!: null;
}

export class PropertyResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiPropertyOptional({ example: '1' })
  partnerId?: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: property_type_enum })
  propertyType!: property_type_enum;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  city!: string;

  @ApiPropertyOptional({ nullable: true })
  district!: string | null;

  @ApiProperty()
  countryCode!: string;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;

  @ApiPropertyOptional({ nullable: true })
  starRating!: number | null;

  @ApiProperty()
  avgRating!: number;

  @ApiProperty()
  totalReviews!: number;

  @ApiProperty({ example: '14:00:00' })
  checkInTime!: string;

  @ApiProperty({ example: '12:00:00' })
  checkOutTime!: string;

  @ApiProperty({ enum: property_status_enum })
  status!: property_status_enum;

  @ApiPropertyOptional({ example: '1', nullable: true })
  reviewerId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedAt?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static from(source: PropertySource): PropertyResponseDto {
    return Object.assign(new PropertyResponseDto(), {
      id: toId(source.id),
      partnerId: source.partnerId ? toId(source.partnerId) : undefined,
      slug: source.slug,
      name: source.name,
      propertyType: source.propertyType,
      description: source.description,
      address: source.address,
      city: source.city,
      district: source.district,
      countryCode: source.countryCode,
      latitude: toNumber(source.latitude),
      longitude: toNumber(source.longitude),
      starRating: source.starRating,
      avgRating: toNumber(source.avgRating),
      totalReviews: source.totalReviews,
      checkInTime: toTime(source.checkInTime),
      checkOutTime: toTime(source.checkOutTime),
      status: source.status,
      reviewerId:
        source.reviewerId === undefined || source.reviewerId === null
          ? source.reviewerId
          : toId(source.reviewerId),
      reviewedAt: source.reviewedAt
        ? toIso(source.reviewedAt)
        : source.reviewedAt,
      createdAt: toIso(source.createdAt),
      updatedAt: toIso(source.updatedAt),
    });
  }
}

export class PartnerKycResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  userId!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty()
  businessType!: string;

  @ApiProperty({ enum: kyc_status_enum })
  kycStatus!: kyc_status_enum;

  @ApiPropertyOptional({ example: '1', nullable: true })
  kycReviewerId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  kycReviewedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static from(source: PartnerKycSource): PartnerKycResponseDto {
    return Object.assign(new PartnerKycResponseDto(), {
      id: toId(source.id),
      userId: toId(source.userId),
      businessName: source.businessName,
      businessType: source.businessType,
      kycStatus: source.kycStatus,
      kycReviewerId: source.kycReviewerId ? toId(source.kycReviewerId) : null,
      kycReviewedAt: source.kycReviewedAt ? toIso(source.kycReviewedAt) : null,
      createdAt: toIso(source.createdAt),
      updatedAt: toIso(source.updatedAt),
    });
  }
}

export class PropertyPolicyResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  propertyId!: string;

  @ApiProperty({ enum: cancellation_type_enum })
  cancellationType!: cancellation_type_enum;

  @ApiPropertyOptional({ nullable: true })
  freeCancelHours!: number | null;

  @ApiProperty()
  cancelPenaltyPercent!: number;

  @ApiProperty()
  minStayNights!: number;

  @ApiPropertyOptional({ nullable: true })
  maxStayNights!: number | null;

  @ApiProperty()
  checkInFrom!: string;

  @ApiProperty()
  checkInUntil!: string;

  @ApiPropertyOptional({ nullable: true })
  checkOutFrom!: string | null;

  @ApiProperty()
  checkOutUntil!: string;

  @ApiProperty()
  earlyCheckInAllowed!: boolean;

  @ApiPropertyOptional({ nullable: true })
  earlyCheckInFee!: number | null;

  @ApiProperty()
  lateCheckOutAllowed!: boolean;

  @ApiPropertyOptional({ nullable: true })
  lateCheckOutFee!: number | null;

  @ApiProperty()
  petsAllowed!: boolean;

  @ApiProperty()
  smokingAllowed!: boolean;

  @ApiProperty()
  childrenAllowed!: boolean;

  @ApiProperty({ enum: no_show_penalty_type_enum })
  noShowPenaltyType!: no_show_penalty_type_enum;

  @ApiProperty()
  instantConfirmation!: boolean;

  @ApiProperty()
  depositRequired!: boolean;

  @ApiPropertyOptional({ enum: discount_type_enum, nullable: true })
  depositType!: discount_type_enum | null;

  @ApiPropertyOptional({ nullable: true })
  depositValue!: number | null;

  @ApiProperty()
  breakfastIncluded!: boolean;

  @ApiProperty({ enum: parking_type_enum })
  parkingType!: parking_type_enum;

  @ApiProperty()
  partiesAllowed!: boolean;

  @ApiPropertyOptional({ nullable: true })
  quietHoursStart!: string | null;

  @ApiPropertyOptional({ nullable: true })
  quietHoursEnd!: string | null;

  @ApiPropertyOptional({ nullable: true })
  customRules!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static from(source: PropertyPolicySource): PropertyPolicyResponseDto {
    return Object.assign(new PropertyPolicyResponseDto(), {
      id: toId(source.id),
      propertyId: toId(source.propertyId),
      cancellationType: source.cancellationType,
      freeCancelHours: source.freeCancelHours,
      cancelPenaltyPercent: toNumber(source.cancelPenaltyPercent),
      minStayNights: source.minStayNights,
      maxStayNights: source.maxStayNights,
      checkInFrom: toTime(source.checkInFrom),
      checkInUntil: toTime(source.checkInUntil),
      checkOutFrom: source.checkOutFrom ? toTime(source.checkOutFrom) : null,
      checkOutUntil: toTime(source.checkOutUntil),
      earlyCheckInAllowed: source.earlyCheckInAllowed,
      earlyCheckInFee:
        source.earlyCheckInFee === null
          ? null
          : toNumber(source.earlyCheckInFee),
      lateCheckOutAllowed: source.lateCheckOutAllowed,
      lateCheckOutFee:
        source.lateCheckOutFee === null
          ? null
          : toNumber(source.lateCheckOutFee),
      petsAllowed: source.petsAllowed,
      smokingAllowed: source.smokingAllowed,
      childrenAllowed: source.childrenAllowed,
      noShowPenaltyType: source.noShowPenaltyType,
      instantConfirmation: source.instantConfirmation,
      depositRequired: source.depositRequired,
      depositType: source.depositType,
      depositValue:
        source.depositValue === null ? null : toNumber(source.depositValue),
      breakfastIncluded: source.breakfastIncluded,
      parkingType: source.parkingType,
      partiesAllowed: source.partiesAllowed,
      quietHoursStart: source.quietHoursStart
        ? toTime(source.quietHoursStart)
        : null,
      quietHoursEnd: source.quietHoursEnd ? toTime(source.quietHoursEnd) : null,
      customRules: source.customRules,
      createdAt: toIso(source.createdAt),
      updatedAt: toIso(source.updatedAt),
    });
  }
}

export class AmenityResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  category!: string;

  @ApiPropertyOptional({ nullable: true })
  iconCode!: string | null;

  static from(source: AmenitySource): AmenityResponseDto {
    return Object.assign(new AmenityResponseDto(), {
      id: toId(source.id),
      name: source.name,
      category: source.category,
      iconCode: source.iconCode,
    });
  }
}

export class PropertyAmenityResponseDto {
  @ApiProperty({ example: '1' })
  propertyId!: string;

  @ApiProperty({ example: '1' })
  amenityId!: string;

  @ApiPropertyOptional({ type: AmenityResponseDto })
  amenity?: AmenityResponseDto;

  static from(source: PropertyAmenitySource): PropertyAmenityResponseDto {
    return Object.assign(new PropertyAmenityResponseDto(), {
      propertyId: toId(source.propertyId),
      amenityId: toId(source.amenityId),
      amenity: source.amenity
        ? AmenityResponseDto.from(source.amenity)
        : undefined,
    });
  }
}

export class MediaResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ enum: media_type_enum })
  mediaType!: media_type_enum;

  @ApiProperty({ enum: media_category_enum })
  category!: media_category_enum;

  @ApiProperty()
  url!: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnailUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  caption!: string | null;

  @ApiProperty()
  isCover!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: string;

  static from(source: MediaSource): MediaResponseDto {
    return Object.assign(new MediaResponseDto(), {
      id: toId(source.id),
      mediaType: source.mediaType,
      category: source.category,
      url: source.url,
      thumbnailUrl: source.thumbnailUrl,
      caption: source.caption,
      isCover: source.isCover,
      sortOrder: source.sortOrder,
      createdAt: toIso(source.createdAt),
    });
  }
}

export class RoomTypeResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  propertyId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  areaSqm!: number | null;

  @ApiProperty()
  maxOccupancy!: number;

  @ApiProperty()
  totalRooms!: number;

  @ApiProperty()
  basePrice!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ nullable: true })
  totalPrice?: number | null;

  @ApiPropertyOptional({ nullable: true })
  minAvailableQty?: number | null;

  @ApiPropertyOptional({ type: [MediaResponseDto] })
  media?: MediaResponseDto[];

  @ApiPropertyOptional({ type: [AmenityResponseDto] })
  amenities?: AmenityResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static from(source: RoomTypeSource): RoomTypeResponseDto {
    return Object.assign(new RoomTypeResponseDto(), {
      id: toId(source.id),
      propertyId: toId(source.propertyId),
      name: source.name,
      description: source.description,
      areaSqm: source.areaSqm === null ? null : toNumber(source.areaSqm),
      maxOccupancy: source.maxOccupancy,
      totalRooms: source.totalRooms,
      basePrice: toNumber(source.basePrice),
      isActive: source.isActive,
      totalPrice: source.total_price,
      minAvailableQty: source.min_available_qty,
      media: source.media?.map(MediaResponseDto.from),
      amenities: source.amenities?.map((item) =>
        AmenityResponseDto.from(item.amenity),
      ),
      createdAt: toIso(source.createdAt),
      updatedAt: toIso(source.updatedAt),
    });
  }
}

export class GenerateDailyRatesResponseDto {
  @ApiProperty({ example: '1' })
  roomTypeId!: string;

  @ApiProperty({ example: '1' })
  ratePlanId!: string;

  @ApiProperty()
  requestedDates!: number;

  @ApiProperty()
  insertedCount!: number;

  static from(source: {
    roomTypeId: bigint;
    ratePlanId: bigint;
    requestedDates: number;
    insertedCount: number;
  }): GenerateDailyRatesResponseDto {
    return Object.assign(new GenerateDailyRatesResponseDto(), {
      roomTypeId: toId(source.roomTypeId),
      ratePlanId: toId(source.ratePlanId),
      requestedDates: source.requestedDates,
      insertedCount: source.insertedCount,
    });
  }
}

export class BookingPropertySummaryResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  address!: string;
}

export class BookingResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty()
  bookingCode!: string;

  @ApiProperty({ example: '1' })
  customerId!: string;

  @ApiProperty({ example: '1' })
  propertyId!: string;

  @ApiProperty({ example: '1' })
  roomTypeId!: string;

  @ApiProperty({ example: '1' })
  ratePlanId!: string;

  @ApiProperty({ example: '2026-06-01' })
  checkInDate!: string;

  @ApiProperty({ example: '2026-06-03' })
  checkOutDate!: string;

  @ApiProperty()
  numNights!: number;

  @ApiProperty()
  numAdults!: number;

  @ApiProperty()
  numChildren!: number;

  @ApiProperty()
  subtotalAmount!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  taxAmount!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: booking_status_enum })
  status!: booking_status_enum;

  @ApiProperty({ enum: payment_status_enum })
  paymentStatus!: payment_status_enum;

  @ApiProperty({ enum: source_channel_enum })
  sourceChannel!: source_channel_enum;

  @ApiPropertyOptional({ nullable: true })
  specialRequests!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cancelledAt!: string | null;

  @ApiPropertyOptional({ type: BookingPropertySummaryResponseDto })
  property?: BookingPropertySummaryResponseDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static from(source: BookingSource): BookingResponseDto {
    return Object.assign(new BookingResponseDto(), {
      id: toId(source.id),
      bookingCode: source.bookingCode,
      customerId: toId(source.customerId),
      propertyId: toId(source.propertyId),
      roomTypeId: toId(source.roomTypeId),
      ratePlanId: toId(source.ratePlanId),
      checkInDate: toDateOnly(source.checkInDate),
      checkOutDate: toDateOnly(source.checkOutDate),
      numNights: source.numNights,
      numAdults: source.numAdults,
      numChildren: source.numChildren,
      subtotalAmount: toNumber(source.subtotalAmount),
      discountAmount: toNumber(source.discountAmount),
      taxAmount: toNumber(source.taxAmount),
      totalAmount: toNumber(source.totalAmount),
      currency: source.currency,
      status: source.status,
      paymentStatus: source.paymentStatus,
      sourceChannel: source.sourceChannel,
      specialRequests: source.specialRequests,
      cancelledAt: source.cancelledAt ? toIso(source.cancelledAt) : null,
      property: source.property
        ? Object.assign(new BookingPropertySummaryResponseDto(), {
            id: toId(source.property.id),
            name: source.property.name,
            city: source.property.city,
            address: source.property.address,
          })
        : undefined,
      createdAt: toIso(source.createdAt),
      updatedAt: toIso(source.updatedAt),
    });
  }
}

export class CancelBookingResponseDto {
  @ApiProperty({ example: '1' })
  bookingId!: string;

  @ApiProperty({ enum: booking_status_enum })
  status!: booking_status_enum;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  penaltyPercent!: number;

  @ApiProperty()
  penaltyAmount!: number;

  @ApiProperty()
  refundAmount!: number;

  static from(source: CancellationSource): CancelBookingResponseDto {
    return Object.assign(new CancelBookingResponseDto(), {
      bookingId: toId(source.booking_id),
      status: source.status,
      totalAmount: toNumber(source.totalAmount),
      penaltyPercent: toNumber(source.penaltyPercent),
      penaltyAmount: toNumber(source.penaltyAmount),
      refundAmount: toNumber(source.refundAmount),
    });
  }
}

export class ReviewIdResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  static from(source: ReviewIdSource): ReviewIdResponseDto {
    return Object.assign(new ReviewIdResponseDto(), { id: toId(source.id) });
  }
}

export class ReviewResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  bookingId!: string;

  @ApiProperty({ example: '1' })
  propertyId!: string;

  @ApiProperty({ example: '1' })
  customerId!: string;

  @ApiProperty()
  overallRating!: number;

  @ApiPropertyOptional({ nullable: true })
  content!: string | null;

  @ApiProperty({ enum: moderation_status_enum })
  moderationStatus!: moderation_status_enum;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static from(source: ReviewSource): ReviewResponseDto {
    return Object.assign(new ReviewResponseDto(), {
      id: toId(source.id),
      bookingId: toId(source.bookingId),
      propertyId: toId(source.propertyId),
      customerId: toId(source.customerId),
      overallRating: toNumber(source.overallRating),
      content: source.content,
      moderationStatus: source.moderationStatus,
      createdAt: toIso(source.createdAt),
      updatedAt: toIso(source.updatedAt),
    });
  }
}

export class PropertySearchItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  property_type!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  city!: string;

  @ApiPropertyOptional({ nullable: true })
  district!: string | null;

  @ApiProperty()
  country_code!: string;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;

  @ApiPropertyOptional({ nullable: true })
  star_rating!: number | null;

  @ApiProperty()
  avg_rating!: number;

  @ApiProperty()
  total_reviews!: number;

  @ApiProperty()
  min_nightly_price!: number;

  @ApiPropertyOptional({ nullable: true })
  min_total_price!: number | null;

  @ApiPropertyOptional({ nullable: true })
  cover_image!: string | null;

  static from(source: PropertySearchItemSource): PropertySearchItemResponseDto {
    return Object.assign(new PropertySearchItemResponseDto(), source);
  }
}

export class PaginationMetaResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  total_pages!: number;
}

export class PaginatedPropertySearchResponseDto {
  @ApiProperty({ type: [PropertySearchItemResponseDto] })
  items!: PropertySearchItemResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  meta!: PaginationMetaResponseDto;

  static from(
    source: PropertySearchSource,
  ): PaginatedPropertySearchResponseDto {
    return Object.assign(new PaginatedPropertySearchResponseDto(), {
      items: source.items.map(PropertySearchItemResponseDto.from),
      meta: Object.assign(new PaginationMetaResponseDto(), source.meta),
    });
  }
}

export class PropertyDetailResponseDto extends PropertyResponseDto {
  @ApiProperty({ type: [MediaResponseDto] })
  media!: MediaResponseDto[];

  @ApiProperty({ type: [PropertyAmenityResponseDto] })
  amenities!: PropertyAmenityResponseDto[];

  @ApiPropertyOptional({ type: PropertyPolicyResponseDto, nullable: true })
  policy!: PropertyPolicyResponseDto | null;

  @ApiProperty({ type: [RoomTypeResponseDto] })
  roomTypes!: RoomTypeResponseDto[];

  static from(source: PropertyDetailSource): PropertyDetailResponseDto {
    return Object.assign(
      new PropertyDetailResponseDto(),
      PropertyResponseDto.from(source),
      {
        media: source.media.map(MediaResponseDto.from),
        amenities: source.amenities.map(PropertyAmenityResponseDto.from),
        policy: source.policy
          ? PropertyPolicyResponseDto.from(source.policy)
          : null,
        roomTypes: source.roomTypes.map(RoomTypeResponseDto.from),
      },
    );
  }
}

export class CheckoutResponseDto {
  @ApiProperty()
  checkoutUrl!: string;
}

export class WebhookResponseDto {
  @ApiProperty()
  received!: boolean;
}

export class PresignedMediaUrlResponseDto {
  @ApiProperty()
  cloudName!: string;

  @ApiProperty()
  apiKey!: string;

  @ApiProperty()
  timestamp!: number;

  @ApiProperty()
  signature!: string;

  @ApiProperty()
  folder!: string;
}
