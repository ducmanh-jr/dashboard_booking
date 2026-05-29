import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, property_status_enum } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { PropertyDetailQueryDto } from './dto/property-detail-query.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

interface DateRange {
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
}

interface SearchPropertyRow {
  id: bigint;
  slug: string;
  name: string;
  property_type: string;
  address: string;
  city: string;
  district: string | null;
  country_code: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  star_rating: number | null;
  avg_rating: Prisma.Decimal;
  total_reviews: number;
  min_nightly_price: Prisma.Decimal;
  min_total_price: Prisma.Decimal | null;
  cover_image: string | null;
  total_count: bigint;
}

interface AvailableRoomTypePriceRow {
  room_type_id: bigint;
  total_price: Prisma.Decimal;
  min_available_qty: number;
}

export interface PropertySearchItem {
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
}

export interface PaginatedPropertySearch {
  items: PropertySearchItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async searchProperties(
    city: string,
    checkInDate: Date,
    checkOutDate: Date,
    guests: number,
  ) {
    return this.prisma.property.findMany({
      where: {
        status: 'active',
        deletedAt: null,
        city: { contains: city, mode: 'insensitive' },
        roomTypes: {
          some: {
            isActive: true,
            deletedAt: null,
            maxOccupancy: { gte: guests },
            ratePlans: {
              some: {
                isActive: true,
                dailyRates: {
                  // At least one date exists in the range (rate plan is configured)
                  some: {
                    date: { gte: checkInDate, lt: checkOutDate },
                  },
                  // No date in the range is sold out
                  none: {
                    date: { gte: checkInDate, lt: checkOutDate },
                    availableQty: { lt: 1 },
                  },
                },
              },
            },
          },
        },
      },
      include: {
        roomTypes: {
          where: {
            isActive: true,
            deletedAt: null,
            maxOccupancy: { gte: guests },
            ratePlans: {
              some: {
                isActive: true,
                dailyRates: {
                  some: {
                    date: { gte: checkInDate, lt: checkOutDate },
                  },
                  none: {
                    date: { gte: checkInDate, lt: checkOutDate },
                    availableQty: { lt: 1 },
                  },
                },
              },
            },
          },
          include: {
            ratePlans: {
              where: { isActive: true },
              include: {
                dailyRates: {
                  where: {
                    date: { gte: checkInDate, lt: checkOutDate },
                  },
                  orderBy: { date: 'asc' },
                },
              },
            },
            media: {
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
          },
        },
        media: {
          where: { isCover: true },
          take: 1,
        },
      },
      orderBy: [{ avgRating: 'desc' }, { totalReviews: 'desc' }, { id: 'asc' }],
    });
  }

  async search(dto: SearchPropertiesDto): Promise<PaginatedPropertySearch> {
    this.validatePriceRange(dto);

    const dateRange = this.parseOptionalDateRange(dto.check_in, dto.check_out);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const offset = (page - 1) * limit;
    const roomsNeeded = dto.rooms_needed ?? 1;

    const rows = dateRange
      ? await this.searchWithAvailability(dto, dateRange, roomsNeeded, limit, offset)
      : await this.searchWithoutAvailability(dto, limit, offset);

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

    return {
      items: rows.map((row) => this.mapSearchRow(row)),
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string, query: PropertyDetailQueryDto) {
    const dateRange = this.parseOptionalDateRange(query.check_in, query.check_out);

    const property = await this.prisma.property.findFirst({
      where: {
        slug,
        status: property_status_enum.active,
      },
      include: {
        media: {
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        policy: true,
        roomTypes: {
          where: {
            isActive: true,
          },
          include: {
            media: {
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
            amenities: {
              include: {
                amenity: true,
              },
            },
          },
          orderBy: {
            basePrice: 'asc',
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (!dateRange) {
      return property;
    }

    const availablePrices = await this.getAvailableRoomTypePrices(
      property.id,
      dateRange,
      1,
    );
    const priceByRoomTypeId = new Map(
      availablePrices.map((row) => [row.room_type_id.toString(), row]),
    );

    return {
      ...property,
      roomTypes: property.roomTypes
        .filter((roomType) => priceByRoomTypeId.has(roomType.id.toString()))
        .map((roomType) => {
          const availability = priceByRoomTypeId.get(roomType.id.toString());

          return {
            ...roomType,
            total_price: availability ? this.toNumber(availability.total_price) : null,
            min_available_qty: availability?.min_available_qty ?? null,
          };
        }),
    };
  }

  async findById(idParam: string, query: PropertyDetailQueryDto) {
    if (!/^\d+$/.test(idParam)) {
      throw new BadRequestException('ID must be a number');
    }
    const id = BigInt(idParam);
    const dateRange = this.parseOptionalDateRange(query.check_in, query.check_out);

    const property = await this.prisma.property.findFirst({
      where: {
        id,
        status: property_status_enum.active,
      },
      include: {
        media: {
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        policy: true,
        roomTypes: {
          where: {
            isActive: true,
          },
          include: {
            media: {
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
            amenities: {
              include: {
                amenity: true,
              },
            },
          },
          orderBy: {
            basePrice: 'asc',
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (!dateRange) {
      return property;
    }

    const availablePrices = await this.getAvailableRoomTypePrices(
      property.id,
      dateRange,
      1,
    );
    const priceByRoomTypeId = new Map(
      availablePrices.map((row) => [row.room_type_id.toString(), row]),
    );

    return {
      ...property,
      roomTypes: property.roomTypes
        .filter((roomType) => priceByRoomTypeId.has(roomType.id.toString()))
        .map((roomType) => {
          const availability = priceByRoomTypeId.get(roomType.id.toString());

          return {
            ...roomType,
            total_price: availability ? this.toNumber(availability.total_price) : null,
            min_available_qty: availability?.min_available_qty ?? null,
          };
        }),
    };
  }

  private async searchWithAvailability(
    dto: SearchPropertiesDto,
    dateRange: DateRange,
    roomsNeeded: number,
    limit: number,
    offset: number,
  ): Promise<SearchPropertyRow[]> {
    const filters = this.buildPropertyFilters(dto, 'available.min_nightly_price');

    return this.prisma.$queryRaw<SearchPropertyRow[]>`
      WITH available_room_types AS (
        SELECT
          rt.property_id,
          rt.id AS room_type_id,
          SUM(dr.price) AS total_price,
          SUM(dr.price) / ${dateRange.nights} AS avg_nightly_price
        FROM room_types rt
        INNER JOIN rate_plans rp ON rp.room_type_id = rt.id AND rp.is_active = true
        INNER JOIN daily_rates dr ON dr.rate_plan_id = rp.id
        WHERE
          rt.is_active = true
          AND dr.date >= ${dateRange.checkInDate}::date
          AND dr.date < ${dateRange.checkOutDate}::date
          AND dr.available_qty >= ${roomsNeeded}
        GROUP BY rt.property_id, rt.id, rp.id
        HAVING COUNT(DISTINCT dr.date) = ${dateRange.nights}
      ),
      available AS (
        SELECT
          property_id,
          MIN(avg_nightly_price) AS min_nightly_price,
          MIN(total_price) AS min_total_price
        FROM available_room_types
        GROUP BY property_id
      )
      SELECT
        p.id,
        p.slug,
        p.name,
        p.property_type::text AS property_type,
        p.address,
        p.city,
        p.district,
        p.country_code,
        p.latitude,
        p.longitude,
        p.star_rating,
        p.avg_rating,
        p.total_reviews,
        available.min_nightly_price,
        available.min_total_price,
        cover.url AS cover_image,
        COUNT(*) OVER() AS total_count
      FROM properties p
      INNER JOIN available ON available.property_id = p.id
      LEFT JOIN LATERAL (
        SELECT pm.url
        FROM property_media pm
        WHERE pm.property_id = p.id
        ORDER BY pm.is_cover DESC, pm.sort_order ASC, pm.id ASC
        LIMIT 1
      ) cover ON true
      WHERE ${Prisma.join(filters, ' AND ')}
      ORDER BY p.avg_rating DESC, p.total_reviews DESC, p.id ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  }

  private async searchWithoutAvailability(
    dto: SearchPropertiesDto,
    limit: number,
    offset: number,
  ): Promise<SearchPropertyRow[]> {
    const filters = this.buildPropertyFilters(dto, 'prices.min_nightly_price');

    return this.prisma.$queryRaw<SearchPropertyRow[]>`
      WITH prices AS (
        SELECT
          rt.property_id,
          MIN(rt.base_price) AS min_nightly_price
        FROM room_types rt
        WHERE rt.is_active = true
        GROUP BY rt.property_id
      )
      SELECT
        p.id,
        p.slug,
        p.name,
        p.property_type::text AS property_type,
        p.address,
        p.city,
        p.district,
        p.country_code,
        p.latitude,
        p.longitude,
        p.star_rating,
        p.avg_rating,
        p.total_reviews,
        prices.min_nightly_price,
        NULL::numeric AS min_total_price,
        cover.url AS cover_image,
        COUNT(*) OVER() AS total_count
      FROM properties p
      INNER JOIN prices ON prices.property_id = p.id
      LEFT JOIN LATERAL (
        SELECT pm.url
        FROM property_media pm
        WHERE pm.property_id = p.id
        ORDER BY pm.is_cover DESC, pm.sort_order ASC, pm.id ASC
        LIMIT 1
      ) cover ON true
      WHERE ${Prisma.join(filters, ' AND ')}
      ORDER BY p.avg_rating DESC, p.total_reviews DESC, p.id ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  }

  private async getAvailableRoomTypePrices(
    propertyId: bigint,
    dateRange: DateRange,
    roomsNeeded: number,
  ): Promise<AvailableRoomTypePriceRow[]> {
    return this.prisma.$queryRaw<AvailableRoomTypePriceRow[]>`
      SELECT
        rt.id AS room_type_id,
        MIN(stay.total_price) AS total_price,
        MAX(stay.min_available_qty) AS min_available_qty
      FROM room_types rt
      INNER JOIN (
        SELECT
          rp.room_type_id,
          rp.id AS rate_plan_id,
          SUM(dr.price) AS total_price,
          MIN(dr.available_qty) AS min_available_qty
        FROM rate_plans rp
        INNER JOIN daily_rates dr ON dr.rate_plan_id = rp.id
        WHERE
          rp.is_active = true
          AND dr.date >= ${dateRange.checkInDate}::date
          AND dr.date < ${dateRange.checkOutDate}::date
          AND dr.available_qty >= ${roomsNeeded}
        GROUP BY rp.room_type_id, rp.id
        HAVING COUNT(DISTINCT dr.date) = ${dateRange.nights}
      ) stay ON stay.room_type_id = rt.id
      WHERE rt.property_id = ${propertyId} AND rt.is_active = true
      GROUP BY rt.id
      ORDER BY total_price ASC
    `;
  }

  private buildPropertyFilters(
    dto: SearchPropertiesDto,
    priceExpression: string,
  ): Prisma.Sql[] {
    const filters: Prisma.Sql[] = [
      Prisma.sql`p.status = 'active'::property_status_enum`,
    ];

    if (dto.city) {
      filters.push(Prisma.sql`p.city ILIKE ${`%${dto.city.trim()}%`}`);
    }

    if (dto.star_rating !== undefined) {
      filters.push(Prisma.sql`p.star_rating = ${dto.star_rating}`);
    }

    if (dto.min_price !== undefined || dto.max_price !== undefined) {
      filters.push(...this.buildPriceFilters(dto, priceExpression));
    }

    return filters;
  }

  private buildPriceFilters(
    dto: SearchPropertiesDto,
    priceExpression: string,
  ): Prisma.Sql[] {
    const filters: Prisma.Sql[] = [];
    const priceSql = Prisma.raw(priceExpression);

    if (dto.min_price !== undefined) {
      filters.push(Prisma.sql`${priceSql} >= ${dto.min_price}`);
    }

    if (dto.max_price !== undefined) {
      filters.push(Prisma.sql`${priceSql} <= ${dto.max_price}`);
    }

    return filters;
  }

  private mapSearchRow(row: SearchPropertyRow): PropertySearchItem {
    return {
      id: row.id.toString(),
      slug: row.slug,
      name: row.name,
      property_type: row.property_type,
      address: row.address,
      city: row.city,
      district: row.district,
      country_code: row.country_code,
      latitude: this.toNumber(row.latitude),
      longitude: this.toNumber(row.longitude),
      star_rating: row.star_rating,
      avg_rating: this.toNumber(row.avg_rating),
      total_reviews: row.total_reviews,
      min_nightly_price: this.toNumber(row.min_nightly_price),
      min_total_price:
        row.min_total_price === null ? null : this.toNumber(row.min_total_price),
      cover_image: row.cover_image,
    };
  }

  private validatePriceRange(dto: SearchPropertiesDto): void {
    if (
      dto.min_price !== undefined &&
      dto.max_price !== undefined &&
      dto.min_price > dto.max_price
    ) {
      throw new BadRequestException('min_price cannot be greater than max_price');
    }
  }

  private parseOptionalDateRange(
    checkInValue: string | undefined,
    checkOutValue: string | undefined,
  ): DateRange | undefined {
    if (!checkInValue && !checkOutValue) {
      return undefined;
    }

    if (!checkInValue || !checkOutValue) {
      throw new BadRequestException('check_in and check_out must be provided together');
    }

    const checkInDate = this.parseDateOnly(checkInValue, 'check_in');
    const checkOutDate = this.parseDateOnly(checkOutValue, 'check_out');
    const nights = Math.floor(
      (checkOutDate.getTime() - checkInDate.getTime()) / MILLISECONDS_PER_DAY,
    );

    if (nights <= 0) {
      throw new BadRequestException('check_out must be after check_in');
    }

    return {
      checkInDate,
      checkOutDate,
      nights,
    };
  }

  private parseDateOnly(value: string, fieldName: string): Date {
    const [yearValue, monthValue, dayValue] = value.split('-').map(Number);
    const date = new Date(Date.UTC(yearValue, monthValue - 1, dayValue));
    const normalized = date.toISOString().slice(0, 10);

    if (normalized !== value) {
      throw new BadRequestException(
        `${fieldName} must be a real date in YYYY-MM-DD format`,
      );
    }

    return date;
  }

  private toNumber(value: Prisma.Decimal | number | string): number {
    return Number(value);
  }
}
