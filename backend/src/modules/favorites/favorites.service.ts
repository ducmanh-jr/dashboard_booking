import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async getFavorites(userId: bigint) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            media: {
              take: 1,
            },
          },
        },
      },
    });

    return favorites.map((fav) => {
      const property = fav.property;
      return {
        id: fav.id.toString(),
        userId: fav.userId.toString(),
        propertyId: fav.propertyId.toString(),
        createdAt: fav.createdAt,
        property: {
          id: property.id.toString(),
          slug: property.slug,
          name: property.name,
          description: property.description,
          propertyType: property.propertyType,
          address: property.address,
          city: property.city,
          district: property.district,
          countryCode: property.countryCode,
          starRating: property.starRating,
          avgRating: property.avgRating ? Number(property.avgRating) : 0,
          totalReviews: property.totalReviews,
          coverImage: property.media[0]?.url || null,
        },
      };
    });
  }

  async addFavorite(userId: bigint, propertyId: bigint) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    if (existing) {
      return {
        id: existing.id.toString(),
        userId: existing.userId.toString(),
        propertyId: existing.propertyId.toString(),
        createdAt: existing.createdAt,
      };
    }

    const favorite = await this.prisma.favorite.create({
      data: {
        userId,
        propertyId,
      },
    });

    return {
      id: favorite.id.toString(),
      userId: favorite.userId.toString(),
      propertyId: favorite.propertyId.toString(),
      createdAt: favorite.createdAt,
    };
  }

  async removeFavorite(userId: bigint, propertyId: bigint) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favorite.delete({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    return { success: true };
  }
}