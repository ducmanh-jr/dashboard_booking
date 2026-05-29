import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CompatController } from './compat.controller';
import { CompatService } from './compat.service';

@Module({
  imports: [AuthModule],
  controllers: [CompatController],
  providers: [CompatService],
})
export class CompatModule {}
