-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "booking_status_enum" AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "business_type_enum" AS ENUM ('individual', 'company');

-- CreateEnum
CREATE TYPE "cancellation_type_enum" AS ENUM ('free', 'flexible', 'moderate', 'strict', 'non_refundable');

-- CreateEnum
CREATE TYPE "charged_to_enum" AS ENUM ('customer', 'partner');

-- CreateEnum
CREATE TYPE "device_type_enum" AS ENUM ('web', 'ios', 'android', 'other');

-- CreateEnum
CREATE TYPE "discount_type_enum" AS ENUM ('percent', 'fixed');

-- CreateEnum
CREATE TYPE "fee_type_enum" AS ENUM ('platform', 'vat', 'service', 'other');

-- CreateEnum
CREATE TYPE "gender_enum" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "identifier_type_enum" AS ENUM ('email', 'phone');

-- CreateEnum
CREATE TYPE "kyc_status_enum" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "loyalty_tier_enum" AS ENUM ('member', 'silver', 'gold', 'platinum');

-- CreateEnum
CREATE TYPE "meal_plan_enum" AS ENUM ('room_only', 'breakfast', 'half_board', 'full_board', 'all_inclusive');

-- CreateEnum
CREATE TYPE "media_category_enum" AS ENUM ('exterior', 'interior', 'room', 'bathroom', 'dining', 'pool', 'amenity', 'other');

-- CreateEnum
CREATE TYPE "media_type_enum" AS ENUM ('image', 'video', 'virtual_tour');

-- CreateEnum
CREATE TYPE "moderation_status_enum" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "no_show_penalty_type_enum" AS ENUM ('full_amount', 'first_night', 'percent');

-- CreateEnum
CREATE TYPE "otp_purpose_enum" AS ENUM ('register', 'login', 'reset_password', 'verify_phone', 'verify_email');

-- CreateEnum
CREATE TYPE "parking_type_enum" AS ENUM ('free', 'paid', 'none');

-- CreateEnum
CREATE TYPE "payment_method_enum" AS ENUM ('credit_card', 'debit_card', 'ewallet', 'bank_transfer', 'pay_later', 'loyalty_cash');

-- CreateEnum
CREATE TYPE "payment_status_enum" AS ENUM ('unpaid', 'partial', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "promo_type_enum" AS ENUM ('early_bird', 'last_minute', 'long_stay', 'flash_sale', 'loyalty', 'custom');

-- CreateEnum
CREATE TYPE "property_status_enum" AS ENUM ('draft', 'pending_review', 'active', 'suspended', 'rejected');

-- CreateEnum
CREATE TYPE "property_type_enum" AS ENUM ('hotel', 'homestay', 'resort', 'apartment', 'villa', 'hostel');

-- CreateEnum
CREATE TYPE "refund_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "room_status_enum" AS ENUM ('available', 'occupied', 'blocked', 'maintenance');

-- CreateEnum
CREATE TYPE "social_provider_enum" AS ENUM ('google', 'facebook', 'apple', 'zalo');

-- CreateEnum
CREATE TYPE "source_channel_enum" AS ENUM ('web', 'mobile', 'ota', 'direct');

-- CreateEnum
CREATE TYPE "user_status_enum" AS ENUM ('active', 'suspended', 'pending', 'deleted');

-- CreateEnum
CREATE TYPE "user_type_enum" AS ENUM ('customer', 'partner', 'admin');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(255) NOT NULL,
    "avatar_url" VARCHAR(500),
    "user_type" "user_type_enum" NOT NULL,
    "status" "user_status_enum" NOT NULL DEFAULT 'pending',
    "email_verified_at" TIMESTAMP(6),
    "last_login_at" TIMESTAMP(6),
    "preferred_language" CHAR(5) NOT NULL DEFAULT 'vi',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" BIGSERIAL NOT NULL,
    "partner_id" BIGINT NOT NULL,
    "slug" VARCHAR(300) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "property_type" "property_type_enum" NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100),
    "country_code" CHAR(2) NOT NULL DEFAULT 'VN',
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "star_rating" SMALLINT,
    "avg_rating" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "check_in_time" TIME(6) NOT NULL DEFAULT '14:00:00'::time without time zone,
    "check_out_time" TIME(6) NOT NULL DEFAULT '12:00:00'::time without time zone,
    "status" "property_status_enum" NOT NULL DEFAULT 'draft',
    "reviewed_by" BIGINT,
    "reviewed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" BIGSERIAL NOT NULL,
    "property_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "area_sqm" DECIMAL(6,2),
    "bed_configuration" VARCHAR(200),
    "max_occupancy" SMALLINT NOT NULL DEFAULT 2,
    "view_type" VARCHAR(100),
    "total_rooms" INTEGER NOT NULL DEFAULT 1,
    "base_price" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" BIGSERIAL NOT NULL,
    "booking_code" VARCHAR(30) NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "property_id" BIGINT NOT NULL,
    "room_type_id" BIGINT NOT NULL,
    "rate_plan_id" BIGINT NOT NULL,
    "check_in_date" DATE NOT NULL,
    "check_out_date" DATE NOT NULL,
    "num_nights" SMALLINT NOT NULL,
    "num_adults" SMALLINT NOT NULL DEFAULT 1,
    "num_children" SMALLINT NOT NULL DEFAULT 0,
    "subtotal_amount" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "platform_fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "partner_payout_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "voucher_id" BIGINT,
    "loyalty_points_used" INTEGER NOT NULL DEFAULT 0,
    "status" "booking_status_enum" NOT NULL DEFAULT 'pending',
    "payment_status" "payment_status_enum" NOT NULL DEFAULT 'unpaid',
    "source_channel" "source_channel_enum" NOT NULL DEFAULT 'web',
    "special_requests" TEXT,
    "cancellation_reason" TEXT,
    "cancelled_by" BIGINT,
    "cancelled_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "icon_code" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_guests" (
    "id" BIGSERIAL NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "id_card_number" VARCHAR(50),
    "date_of_birth" DATE,
    "nationality" CHAR(2),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "date_of_birth" DATE,
    "gender" "gender_enum",
    "nationality" CHAR(2),
    "id_card_number" VARCHAR(50),
    "loyalty_tier" "loyalty_tier_enum" NOT NULL DEFAULT 'member',
    "loyalty_points_balance" INTEGER NOT NULL DEFAULT 0,
    "total_bookings" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_rates" (
    "id" BIGSERIAL NOT NULL,
    "rate_plan_id" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "available_qty" INTEGER NOT NULL,
    "min_stay" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "identifier" VARCHAR(255) NOT NULL,
    "identifier_type" "identifier_type_enum" NOT NULL,
    "purpose" "otp_purpose_enum" NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "used_at" TIMESTAMP(6),
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_profiles" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "business_name" VARCHAR(255) NOT NULL,
    "business_type" "business_type_enum" NOT NULL,
    "tax_code" VARCHAR(50),
    "id_card_number" VARCHAR(50),
    "contract_url" VARCHAR(500),
    "kyc_status" "kyc_status_enum" NOT NULL DEFAULT 'pending',
    "kyc_reviewed_by" BIGINT,
    "kyc_reviewed_at" TIMESTAMP(6),
    "bank_account_name" VARCHAR(255),
    "bank_account_number" VARCHAR(100),
    "bank_name" VARCHAR(100),
    "commission_tier" VARCHAR(50) NOT NULL DEFAULT 'standard',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" BIGSERIAL NOT NULL,
    "partner_id" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "promo_type" "promo_type_enum" NOT NULL,
    "discount_type" "discount_type_enum" NOT NULL,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "max_discount" DECIMAL(12,2),
    "min_order_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "max_uses" INTEGER,
    "total_used" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_amenities" (
    "property_id" BIGINT NOT NULL,
    "amenity_id" BIGINT NOT NULL,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id","amenity_id")
);

-- CreateTable
CREATE TABLE "property_media" (
    "id" BIGSERIAL NOT NULL,
    "property_id" BIGINT NOT NULL,
    "room_type_id" BIGINT,
    "media_type" "media_type_enum" NOT NULL DEFAULT 'image',
    "category" "media_category_enum" NOT NULL DEFAULT 'other',
    "url" VARCHAR(500) NOT NULL,
    "thumbnail_url" VARCHAR(500),
    "caption" VARCHAR(500),
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "uploaded_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_policies" (
    "id" BIGSERIAL NOT NULL,
    "property_id" BIGINT NOT NULL,
    "cancellation_type" "cancellation_type_enum" NOT NULL DEFAULT 'flexible',
    "free_cancel_hours" SMALLINT,
    "cancel_penalty_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "min_stay_nights" SMALLINT NOT NULL DEFAULT 1,
    "max_stay_nights" SMALLINT,
    "check_in_from" TIME(6) NOT NULL DEFAULT '14:00:00'::time without time zone,
    "check_in_until" TIME(6) NOT NULL DEFAULT '22:00:00'::time without time zone,
    "check_out_from" TIME(6) DEFAULT '00:00:00'::time without time zone,
    "check_out_until" TIME(6) NOT NULL DEFAULT '12:00:00'::time without time zone,
    "early_check_in_allowed" BOOLEAN NOT NULL DEFAULT false,
    "early_check_in_fee" DECIMAL(12,2),
    "late_check_out_allowed" BOOLEAN NOT NULL DEFAULT false,
    "late_check_out_fee" DECIMAL(12,2),
    "pets_allowed" BOOLEAN NOT NULL DEFAULT false,
    "pet_fee" DECIMAL(12,2),
    "pet_max_weight_kg" DECIMAL(5,2),
    "smoking_allowed" BOOLEAN NOT NULL DEFAULT false,
    "smoking_penalty" DECIMAL(12,2),
    "children_allowed" BOOLEAN NOT NULL DEFAULT true,
    "min_child_age" SMALLINT DEFAULT 0,
    "infant_0_4_fee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "child_5_11_fee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "free_baby_cot" BOOLEAN NOT NULL DEFAULT false,
    "child_5_11_must_use_extra_bed" BOOLEAN NOT NULL DEFAULT false,
    "extra_bed_available" BOOLEAN NOT NULL DEFAULT false,
    "extra_bed_charge" DECIMAL(12,2),
    "extra_person_fee" DECIMAL(12,2),
    "no_show_penalty_type" "no_show_penalty_type_enum" NOT NULL DEFAULT 'full_amount',
    "no_show_penalty_value" DECIMAL(12,2),
    "instant_confirmation" BOOLEAN NOT NULL DEFAULT true,
    "deposit_required" BOOLEAN NOT NULL DEFAULT false,
    "deposit_type" "discount_type_enum",
    "deposit_value" DECIMAL(12,2),
    "deposit_days_before" SMALLINT,
    "accepted_payment_methods" JSONB,
    "wifi_fee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "breakfast_included" BOOLEAN NOT NULL DEFAULT false,
    "breakfast_fee" DECIMAL(12,2),
    "airport_shuttle_available" BOOLEAN NOT NULL DEFAULT false,
    "airport_shuttle_fee" DECIMAL(12,2),
    "parking_type" "parking_type_enum" NOT NULL DEFAULT 'none',
    "parking_fee" DECIMAL(12,2),
    "parties_allowed" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" TIME(6),
    "quiet_hours_end" TIME(6),
    "requires_marriage_certificate" BOOLEAN NOT NULL DEFAULT false,
    "damage_deposit_required" BOOLEAN NOT NULL DEFAULT false,
    "damage_deposit_amount" DECIMAL(12,2),
    "custom_rules" TEXT,
    "liability_waiver" TEXT,
    "force_majeure_policy" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_plans" (
    "id" BIGSERIAL NOT NULL,
    "room_type_id" BIGINT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "meal_plan" "meal_plan_enum" NOT NULL DEFAULT 'room_only',
    "refundable" BOOLEAN NOT NULL DEFAULT true,
    "base_price" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type_amenities" (
    "room_type_id" BIGINT NOT NULL,
    "amenity_id" BIGINT NOT NULL,

    CONSTRAINT "room_type_amenities_pkey" PRIMARY KEY ("room_type_id","amenity_id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" BIGSERIAL NOT NULL,
    "room_type_id" BIGINT NOT NULL,
    "property_id" BIGINT NOT NULL,
    "room_number" VARCHAR(20) NOT NULL,
    "floor" SMALLINT,
    "status" "room_status_enum" NOT NULL DEFAULT 'available',
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "provider" "social_provider_enum" NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(255),
    "device_type" "device_type_enum" NOT NULL DEFAULT 'web',
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "last_active_at" TIMESTAMP(6),
    "expires_at" TIMESTAMP(6) NOT NULL,
    "revoked_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" BIGSERIAL NOT NULL,
    "promotion_id" BIGINT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "max_uses_per_user" SMALLINT NOT NULL DEFAULT 1,
    "total_used" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" BIGSERIAL NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "property_id" BIGINT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "overall_rating" DECIMAL(3,1) NOT NULL,
    "cleanliness_rating" DECIMAL(3,1),
    "service_rating" DECIMAL(3,1),
    "location_rating" DECIMAL(3,1),
    "value_rating" DECIMAL(3,1),
    "title" VARCHAR(255),
    "content" TEXT,
    "moderation_status" "moderation_status_enum" NOT NULL DEFAULT 'pending',
    "moderated_by" BIGINT,
    "moderated_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" BIGINT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_uuid" ON "users"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_phone" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("status");

-- CreateIndex
CREATE INDEX "idx_users_type_status" ON "users"("user_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_property_slug" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "idx_prop_location" ON "properties"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "idx_prop_partner" ON "properties"("partner_id");

-- CreateIndex
CREATE INDEX "idx_prop_rating" ON "properties"("status", "avg_rating");

-- CreateIndex
CREATE INDEX "idx_prop_search" ON "properties"("city", "status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_booking_code" ON "bookings"("booking_code");

-- CreateIndex
CREATE INDEX "idx_booking_customer" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "idx_booking_customer_status" ON "bookings"("customer_id", "status");

-- CreateIndex
CREATE INDEX "idx_booking_property" ON "bookings"("property_id");

-- CreateIndex
CREATE INDEX "idx_booking_property_dates" ON "bookings"("property_id", "check_in_date", "check_out_date");

-- CreateIndex
CREATE UNIQUE INDEX "uq_amenity_name" ON "amenities"("name");

-- CreateIndex
CREATE INDEX "idx_bg_booking" ON "booking_guests"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_customer_user" ON "customer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_daily_rate_plan_date" ON "daily_rates"("rate_plan_id", "date");

-- CreateIndex
CREATE INDEX "idx_daily_rate_date_available" ON "daily_rates"("date", "available_qty");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daily_rate" ON "daily_rates"("rate_plan_id", "date");

-- CreateIndex
CREATE INDEX "idx_otp_lookup" ON "otp_tokens"("identifier", "purpose", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_partner_user" ON "partner_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_pmedia_prop" ON "property_media"("property_id", "category", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "uq_policy_prop" ON "property_policies"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_room_property" ON "rooms"("property_id", "room_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_social_provider" ON "social_accounts"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_session_token" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "idx_session_active" ON "user_sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_voucher_code" ON "vouchers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_rev_booking" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "idx_review_property_status" ON "reviews"("property_id", "moderation_status", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_review_customer" ON "reviews"("customer_id");

-- CreateIndex
CREATE INDEX "idx_audit_actor" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "idx_audit_created" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "fk_property_partner" FOREIGN KEY ("partner_id") REFERENCES "partner_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "fk_property_reviewer" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "fk_rt_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_booking_canceler" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_booking_cust" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_booking_prop" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_booking_rt" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_booking_rp" FOREIGN KEY ("rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_booking_voucher" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "fk_bg_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "fk_customer_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_rates" ADD CONSTRAINT "fk_dr_rp" FOREIGN KEY ("rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "otp_tokens" ADD CONSTRAINT "fk_otp_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partner_profiles" ADD CONSTRAINT "fk_partner_reviewer" FOREIGN KEY ("kyc_reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partner_profiles" ADD CONSTRAINT "fk_partner_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "fk_promo_partner" FOREIGN KEY ("partner_id") REFERENCES "partner_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "fk_pa_amenity" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "fk_pa_prop" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_media" ADD CONSTRAINT "fk_pmedia_prop" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_media" ADD CONSTRAINT "fk_pmedia_rt" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_media" ADD CONSTRAINT "fk_pmedia_up" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_policies" ADD CONSTRAINT "fk_policy_prop" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rate_plans" ADD CONSTRAINT "fk_rp_rt" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "fk_rta_amenity" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "fk_rta_rt" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "fk_room_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "fk_room_type" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "fk_social_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "fk_session_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "fk_voucher_promo" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_rev_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_rev_cust" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_rev_mod" FOREIGN KEY ("moderated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_rev_prop" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

