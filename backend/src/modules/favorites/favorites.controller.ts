import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user favorites' })
  async getFavorites(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.getFavorites(BigInt(user.id));
  }

  @Post()
  @ApiOperation({ summary: 'Add a property to favorites' })
  async addFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFavoriteDto,
  ) {
    return this.favoritesService.addFavorite(BigInt(user.id), BigInt(dto.propertyId));
  }

  @Delete(':propertyId')
  @ApiOperation({ summary: 'Remove a property from favorites' })
  async removeFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.favoritesService.removeFavorite(BigInt(user.id), BigInt(propertyId));
  }
}