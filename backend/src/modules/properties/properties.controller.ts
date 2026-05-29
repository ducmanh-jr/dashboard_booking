import {
  CacheInterceptor,
  CacheTTL,
} from '@nestjs/cache-manager';
import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { PropertyDetailQueryDto } from './dto/property-detail-query.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';
import { PropertiesService } from './properties.service';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Public()
  @Get('search')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(15 * 60 * 1000)
  @ApiOperation({ summary: 'Search public properties' })
  @ApiResponse({
    status: 200,
    description: 'Returns active properties matching search and availability.',
  })
  search(@Query() query: SearchPropertiesDto) {
    return this.propertiesService.search(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get public property detail by slug' })
  @ApiResponse({
    status: 200,
    description: 'Returns property details and room types.',
  })
  findBySlug(
    @Param('slug') slug: string,
    @Query() query: PropertyDetailQueryDto,
  ) {
    return this.propertiesService.findBySlug(slug, query);
  }

  @Public()
  @Get('id/:id')
  @ApiOperation({ summary: 'Get public property detail by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns property details and room types.',
  })
  findById(
    @Param('id') id: string,
    @Query() query: PropertyDetailQueryDto,
  ) {
    return this.propertiesService.findById(id, query);
  }
}
