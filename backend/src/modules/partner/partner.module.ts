import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { PartnerService } from './partner.service';
import { PartnerPropertiesController } from './properties.controller';
import { PartnerRoomTypesController } from './room-types.controller';
import { PartnerVouchersController } from './vouchers.controller';
import { PartnerBookingReportController } from './booking-report.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    PartnerPropertiesController,
    PartnerRoomTypesController,
    PartnerVouchersController,
    PartnerBookingReportController,
    MediaController,
  ],
  providers: [PartnerService, MediaService],
})
export class PartnerModule {}
