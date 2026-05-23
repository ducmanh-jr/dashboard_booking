import { Module } from '@nestjs/common';

import { BookingsController } from './bookings.controller';
import { BookingsCron } from './bookings.cron';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingsCron],
})
export class BookingsModule {}
