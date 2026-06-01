import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthCron {
  private readonly logger = new Logger(AuthCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chạy mỗi giờ.
   * Xóa các email trong danh sách đen đối tác đã hết hạn,
   * để cho phép họ đăng ký lại như bình thường.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredBlacklists(): Promise<void> {
    try {
      const expired = await this.prisma.partnerBlacklist.findMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      if (expired.length === 0) return;

      for (const entry of expired) {
        const user = await this.prisma.user.findFirst({
          where: { email: entry.email },
          select: { id: true },
        });

        if (user) {
          const userId = user.id;
          await this.prisma.$transaction(async (tx) => {
            // Nullify foreign keys in references
            await tx.$executeRaw`UPDATE bookings SET cancelled_by = NULL WHERE cancelled_by = ${userId}`;
            await tx.$executeRaw`UPDATE reviews SET moderated_by = NULL WHERE moderated_by = ${userId}`;
            await tx.$executeRaw`UPDATE support_tickets SET assigned_to = NULL WHERE assigned_to = ${userId}`;
            await tx.$executeRaw`UPDATE disputes SET resolved_by = NULL WHERE resolved_by = ${userId}`;
            await tx.$executeRaw`UPDATE refunds SET processed_by = NULL WHERE processed_by = ${userId}`;
            await tx.$executeRaw`UPDATE risk_assessments SET reviewed_by = NULL WHERE reviewed_by = ${userId}`;
            await tx.$executeRaw`UPDATE payout_requests SET reviewed_by = NULL WHERE reviewed_by = ${userId}`;

            // Check and delete property records
            const partnerProfile = await tx.partnerProfile.findUnique({
              where: { userId },
              select: { id: true },
            });

            if (partnerProfile) {
              const partnerId = partnerProfile.id;
              await tx.$executeRaw`DELETE FROM property_policies WHERE property_id IN (SELECT id FROM properties WHERE partner_id = ${partnerId})`;
              await tx.$executeRaw`DELETE FROM property_amenities WHERE property_id IN (SELECT id FROM properties WHERE partner_id = ${partnerId})`;
              await tx.$executeRaw`DELETE FROM property_media WHERE property_id IN (SELECT id FROM properties WHERE partner_id = ${partnerId})`;
              await tx.$executeRaw`DELETE FROM daily_rates WHERE rate_plan_id IN (SELECT id FROM rate_plans WHERE room_type_id IN (SELECT id FROM room_types WHERE property_id IN (SELECT id FROM properties WHERE partner_id = ${partnerId})))`;
              await tx.$executeRaw`DELETE FROM rate_plans WHERE room_type_id IN (SELECT id FROM room_types WHERE property_id IN (SELECT id FROM properties WHERE partner_id = ${partnerId}))`;
              await tx.$executeRaw`DELETE FROM rooms WHERE property_id IN (SELECT id FROM properties WHERE partner_id = ${partnerId})`;
              await tx.$executeRaw`DELETE FROM room_type_amenities WHERE room_type_id IN (SELECT id FROM room_types WHERE property_id IN (SELECT id FROM properties WHERE partner_id = ${partnerId}))`;
              await tx.$executeRaw`DELETE FROM room_types WHERE property_id IN (SELECT id FROM properties WHERE partner_id = ${partnerId})`;
              await tx.$executeRaw`DELETE FROM properties WHERE partner_id = ${partnerId}`;
              await tx.$executeRaw`DELETE FROM partner_profiles WHERE id = ${partnerId}`;
            }

            // Delete other user dependent records
            await tx.$executeRaw`DELETE FROM user_roles WHERE user_id = ${userId}`;
            await tx.$executeRaw`DELETE FROM user_sessions WHERE user_id = ${userId}`;
            await tx.$executeRaw`DELETE FROM social_accounts WHERE user_id = ${userId}`;
            await tx.$executeRaw`DELETE FROM otp_tokens WHERE user_id = ${userId}`;
            await tx.$executeRaw`DELETE FROM customer_profiles WHERE user_id = ${userId}`;
            await tx.$executeRaw`DELETE FROM audit_logs WHERE actor_id = ${userId}`;
            await tx.$executeRaw`DELETE FROM notifications WHERE user_id = ${userId}`;
            await tx.$executeRaw`DELETE FROM users WHERE id = ${userId}`;

            // Delete blacklist entry
            await tx.partnerBlacklist.delete({
              where: { id: entry.id },
            });
          });

          this.logger.log(`Deleted user and cleared partner blacklist for: ${entry.email}`);
        } else {
          // If no user exists, just delete blacklist entry
          await this.prisma.partnerBlacklist.delete({
            where: { id: entry.id },
          });
          this.logger.log(`Deleted expired blacklist entry without user: ${entry.email}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired blacklists', error);
    }
  }
}
