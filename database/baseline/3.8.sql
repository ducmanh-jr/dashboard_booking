DROP DATABASE IF EXISTS agoda_clone;
CREATE DATABASE agoda_clone DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agoda_clone;

-- Bật tắt FK Check để an toàn khi Init DB
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500) DEFAULT NULL,
  user_type ENUM('customer','partner','staff') NOT NULL,
  status ENUM('active','suspended','pending','deleted') NOT NULL DEFAULT 'pending',
  email_verified_at DATETIME DEFAULT NULL,
  last_login_at DATETIME DEFAULT NULL,
  preferred_language CHAR(5) NOT NULL DEFAULT 'vi',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_users_uuid (uuid), UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone), KEY idx_users_type_status (user_type, status),
  KEY idx_users_status (status),
  -- CHECK constraint (MySQL 8+)
  CONSTRAINT chk_email_not_empty CHECK (email <> ''),
  CONSTRAINT chk_phone_format CHECK (phone IS NULL OR phone <> '')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE social_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('google','facebook','apple','zalo') NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  access_token TEXT DEFAULT NULL,
  refresh_token TEXT DEFAULT NULL,
  token_expires_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_social_provider (provider, provider_id),
  KEY idx_social_user (user_id),
  CONSTRAINT fk_social_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE partner_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type ENUM('individual','company') NOT NULL,
  tax_code VARCHAR(50) DEFAULT NULL,
  id_card_number VARCHAR(50) DEFAULT NULL,
  contract_url VARCHAR(500) DEFAULT NULL,
  kyc_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  kyc_reviewed_by BIGINT UNSIGNED DEFAULT NULL,
  kyc_reviewed_at DATETIME DEFAULT NULL,
  bank_account_name VARCHAR(255) DEFAULT NULL,
  bank_account_number VARCHAR(100) DEFAULT NULL,
  bank_name VARCHAR(100) DEFAULT NULL,
  commission_tier VARCHAR(50) NOT NULL DEFAULT 'standard',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_partner_user (user_id),
  CONSTRAINT fk_partner_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_partner_reviewer FOREIGN KEY (kyc_reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customer_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  date_of_birth DATE DEFAULT NULL,
  gender ENUM('male','female','other') DEFAULT NULL,
  nationality CHAR(2) DEFAULT NULL,
  id_card_number VARCHAR(50) DEFAULT NULL,
  loyalty_tier ENUM('member','silver','gold','platinum') NOT NULL DEFAULT 'member',
  loyalty_points_balance INT UNSIGNED NOT NULL DEFAULT 0,
  total_bookings INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_customer_user (user_id),
  CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE otp_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  identifier VARCHAR(255) NOT NULL,
  identifier_type ENUM('email','phone') NOT NULL,
  purpose ENUM('register','login','reset_password','verify_phone','verify_email') NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_otp_lookup (identifier, purpose, expires_at),
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  device_name VARCHAR(255) DEFAULT NULL,
  device_type ENUM('web','ios','android','other') NOT NULL DEFAULT 'web',
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  last_active_at DATETIME DEFAULT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_session_token (token_hash),
  KEY idx_session_active (user_id, revoked_at, expires_at),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE properties (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(300) NOT NULL,
  name VARCHAR(500) NOT NULL,
  property_type ENUM('hotel','homestay','resort','apartment','villa','hostel') NOT NULL,
  description TEXT DEFAULT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100) DEFAULT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'VN',
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  star_rating TINYINT UNSIGNED DEFAULT NULL,
  avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_reviews INT UNSIGNED NOT NULL DEFAULT 0,
  check_in_time TIME NOT NULL DEFAULT '14:00:00',
  check_out_time TIME NOT NULL DEFAULT '12:00:00',
  status ENUM('draft','pending_review','active','suspended') NOT NULL DEFAULT 'draft',
  reviewed_by BIGINT UNSIGNED DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_property_slug (slug),
  KEY idx_prop_partner (partner_id), KEY idx_prop_search (city, status),
  CONSTRAINT fk_property_partner FOREIGN KEY (partner_id) REFERENCES partner_profiles (id),
  CONSTRAINT fk_property_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_star_rating CHECK (star_rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE room_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  area_sqm DECIMAL(6,2) DEFAULT NULL,
  bed_configuration VARCHAR(200) DEFAULT NULL,
  max_occupancy TINYINT UNSIGNED NOT NULL DEFAULT 2,
  view_type VARCHAR(100) DEFAULT NULL,
  total_rooms SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  base_price DECIMAL(12,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_rt_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_type_id BIGINT UNSIGNED NOT NULL,
  property_id BIGINT UNSIGNED NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  floor SMALLINT DEFAULT NULL,
  status ENUM('available','occupied','blocked','maintenance') NOT NULL DEFAULT 'available',
  notes TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_room_property (property_id, room_number),
  CONSTRAINT fk_room_type FOREIGN KEY (room_type_id) REFERENCES room_types (id) ON DELETE CASCADE,
  CONSTRAINT fk_room_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE amenities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  icon_code VARCHAR(50) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_amenity_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE property_amenities (
  property_id BIGINT UNSIGNED NOT NULL,
  amenity_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (property_id, amenity_id),
  CONSTRAINT fk_pa_prop FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_amenity FOREIGN KEY (amenity_id) REFERENCES amenities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE room_type_amenities (
  room_type_id BIGINT UNSIGNED NOT NULL,
  amenity_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (room_type_id, amenity_id),
  CONSTRAINT fk_rta_rt FOREIGN KEY (room_type_id) REFERENCES room_types (id) ON DELETE CASCADE,
  CONSTRAINT fk_rta_amenity FOREIGN KEY (amenity_id) REFERENCES amenities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE property_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  room_type_id BIGINT UNSIGNED DEFAULT NULL,
  media_type ENUM('image','video','virtual_tour') NOT NULL DEFAULT 'image',
  category ENUM('exterior','interior','room','bathroom','dining','pool','amenity','other') NOT NULL DEFAULT 'other',
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500) DEFAULT NULL,
  caption VARCHAR(500) DEFAULT NULL,
  is_cover TINYINT(1) NOT NULL DEFAULT 0,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pmedia_prop (property_id, category, sort_order),
  CONSTRAINT fk_pmedia_prop FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE,
  CONSTRAINT fk_pmedia_rt FOREIGN KEY (room_type_id) REFERENCES room_types (id) ON DELETE CASCADE,
  CONSTRAINT fk_pmedia_up FOREIGN KEY (uploaded_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE property_policies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  cancellation_type ENUM('free','flexible','moderate','strict','non_refundable') NOT NULL DEFAULT 'flexible',
  free_cancel_hours SMALLINT UNSIGNED DEFAULT NULL,
  cancel_penalty_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  min_stay_nights TINYINT UNSIGNED NOT NULL DEFAULT 1,
  max_stay_nights TINYINT UNSIGNED DEFAULT NULL,
  check_in_from TIME NOT NULL DEFAULT '14:00:00',
  check_in_until TIME NOT NULL DEFAULT '22:00:00',
  check_out_until TIME NOT NULL DEFAULT '12:00:00',
  pets_allowed TINYINT(1) NOT NULL DEFAULT 0,
  smoking_allowed TINYINT(1) NOT NULL DEFAULT 0,
  children_allowed TINYINT(1) NOT NULL DEFAULT 1,
  extra_bed_available TINYINT(1) NOT NULL DEFAULT 0,
  extra_bed_charge DECIMAL(12,2) DEFAULT NULL,
  custom_rules TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_policy_prop (property_id),
  CONSTRAINT fk_policy_prop FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rate_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_type_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  meal_plan ENUM('room_only','breakfast','half_board','full_board','all_inclusive') NOT NULL DEFAULT 'room_only',
  refundable TINYINT(1) NOT NULL DEFAULT 1,
  base_price DECIMAL(12,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_rp_rt FOREIGN KEY (room_type_id) REFERENCES room_types (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE daily_rates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rate_plan_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  available_qty SMALLINT UNSIGNED NOT NULL,
  min_stay TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_daily_rate (rate_plan_id, date),
  CONSTRAINT fk_dr_rp FOREIGN KEY (rate_plan_id) REFERENCES rate_plans (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE promotions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id BIGINT UNSIGNED DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  promo_type ENUM('early_bird','last_minute','long_stay','flash_sale','loyalty','custom') NOT NULL,
  discount_type ENUM('percent','fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount DECIMAL(12,2) DEFAULT NULL,
  min_order_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_uses INT UNSIGNED DEFAULT NULL,
  total_used INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_promo_partner FOREIGN KEY (partner_id) REFERENCES partner_profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vouchers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  promotion_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  max_uses_per_user TINYINT UNSIGNED NOT NULL DEFAULT 1,
  total_used INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_voucher_code (code),
  CONSTRAINT fk_voucher_promo FOREIGN KEY (promotion_id) REFERENCES promotions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE voucher_usages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  voucher_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  discount_applied DECIMAL(12,2) NOT NULL,
  used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_vu_voucher_booking (voucher_id, booking_id),
  KEY idx_vu_user_voucher (user_id, voucher_id),
  CONSTRAINT fk_vu_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE CASCADE,
  CONSTRAINT fk_vu_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_code VARCHAR(30) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  property_id BIGINT UNSIGNED NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  num_nights TINYINT UNSIGNED NOT NULL,
  num_adults TINYINT UNSIGNED NOT NULL DEFAULT 1,
  num_children TINYINT UNSIGNED NOT NULL DEFAULT 0,
  subtotal_amount DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  platform_fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  partner_payout_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  voucher_id BIGINT UNSIGNED DEFAULT NULL,
  loyalty_points_used INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('pending','confirmed','checked_in','checked_out','cancelled','no_show') NOT NULL DEFAULT 'pending',
  payment_status ENUM('unpaid','partial','paid','refunded') NOT NULL DEFAULT 'unpaid',
  source_channel ENUM('web','mobile','ota','direct') NOT NULL DEFAULT 'web',
  special_requests TEXT DEFAULT NULL,
  cancellation_reason TEXT DEFAULT NULL,
  cancelled_by BIGINT UNSIGNED DEFAULT NULL,
  cancelled_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_booking_code (booking_code),
  KEY idx_booking_customer (customer_id), KEY idx_booking_property (property_id),
  CONSTRAINT fk_booking_cust FOREIGN KEY (customer_id) REFERENCES users (id),
  CONSTRAINT fk_booking_prop FOREIGN KEY (property_id) REFERENCES properties (id),
  CONSTRAINT fk_booking_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_canceler FOREIGN KEY (cancelled_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE booking_rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  rate_plan_id BIGINT UNSIGNED NOT NULL,
  room_price DECIMAL(12,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_br_booking_room (booking_id, room_id),
  CONSTRAINT fk_br_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
  CONSTRAINT fk_br_room FOREIGN KEY (room_id) REFERENCES rooms (id),
  CONSTRAINT fk_br_rp FOREIGN KEY (rate_plan_id) REFERENCES rate_plans (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE booking_guests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  id_card_number VARCHAR(50) DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  nationality CHAR(2) DEFAULT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_bg_booking (booking_id),
  CONSTRAINT fk_bg_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE booking_fees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  fee_config_id BIGINT UNSIGNED DEFAULT NULL,
  fee_name VARCHAR(200) NOT NULL,
  fee_type ENUM('platform','vat','service','other') NOT NULL,
  rate_snapshot DECIMAL(8,4) DEFAULT NULL,
  base_amount DECIMAL(12,2) NOT NULL,
  fee_amount DECIMAL(12,2) NOT NULL,
  charged_to ENUM('customer','partner') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_bf_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  transaction_ref VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  payment_method ENUM('credit_card','debit_card','ewallet','bank_transfer','pay_later','loyalty_cash') NOT NULL,
  gateway VARCHAR(50) NOT NULL,
  gateway_response JSON DEFAULT NULL,
  status ENUM('pending','success','failed','cancelled') NOT NULL DEFAULT 'pending',
  paid_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_pay_ref (transaction_ref),
  CONSTRAINT fk_pay_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE refunds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  processed_by BIGINT UNSIGNED DEFAULT NULL,
  processed_at DATETIME DEFAULT NULL,
  gateway_ref VARCHAR(100) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ref_pay FOREIGN KEY (payment_id) REFERENCES payments (id),
  CONSTRAINT fk_ref_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
  CONSTRAINT fk_ref_processor FOREIGN KEY (processed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE wishlists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  property_id BIGINT UNSIGNED NOT NULL,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_wl_user_prop (user_id, property_id),
  CONSTRAINT fk_wl_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_wl_prop FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  property_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  overall_rating DECIMAL(3,1) NOT NULL,
  cleanliness_rating DECIMAL(3,1) DEFAULT NULL,
  service_rating DECIMAL(3,1) DEFAULT NULL,
  location_rating DECIMAL(3,1) DEFAULT NULL,
  value_rating DECIMAL(3,1) DEFAULT NULL,
  title VARCHAR(255) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  moderation_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  moderated_by BIGINT UNSIGNED DEFAULT NULL,
  moderated_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_rev_booking (booking_id),
  CONSTRAINT fk_rev_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
  CONSTRAINT fk_rev_prop FOREIGN KEY (property_id) REFERENCES properties (id),
  CONSTRAINT fk_rev_cust FOREIGN KEY (customer_id) REFERENCES users (id),
  CONSTRAINT fk_rev_mod FOREIGN KEY (moderated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE review_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  review_id BIGINT UNSIGNED NOT NULL,
  media_type ENUM('image','video') NOT NULL DEFAULT 'image',
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500) DEFAULT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_rm_review FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE review_responses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  review_id BIGINT UNSIGNED NOT NULL,
  responder_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_rr_review (review_id),
  CONSTRAINT fk_rr_rev FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
  CONSTRAINT fk_rr_resp FOREIGN KEY (responder_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payout_wallets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id BIGINT UNSIGNED NOT NULL,
  available_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  pending_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_earned DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_withdrawn DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_wal_partner (partner_id),
  CONSTRAINT fk_wal_partner FOREIGN KEY (partner_id) REFERENCES partner_profiles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE wallet_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wallet_id BIGINT UNSIGNED NOT NULL,
  type ENUM('credit','debit') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  description VARCHAR(500) NOT NULL,
  ref_type VARCHAR(50) DEFAULT NULL,
  ref_id BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_wt_wal FOREIGN KEY (wallet_id) REFERENCES payout_wallets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payout_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wallet_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending','approved','rejected','processing','completed') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  note TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_pr_wal FOREIGN KEY (wallet_id) REFERENCES payout_wallets (id),
  CONSTRAINT fk_pr_rev FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE commission_configs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  scope ENUM('global','partner_tier','partner','property_type','country') NOT NULL DEFAULT 'global',
  scope_value VARCHAR(100) DEFAULT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  min_commission DECIMAL(12,2) DEFAULT NULL,
  max_commission DECIMAL(12,2) DEFAULT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NOT NULL,
  notes TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cc_creat FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE platform_fee_configs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  fee_type ENUM('percent','fixed') NOT NULL,
  fee_value DECIMAL(8,4) NOT NULL,
  applies_to ENUM('all','property_type','partner_tier','country') NOT NULL DEFAULT 'all',
  applies_value VARCHAR(100) DEFAULT NULL,
  min_fee DECIMAL(12,2) DEFAULT NULL,
  max_fee DECIMAL(12,2) DEFAULT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_pfc_creat FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE loyalty_point_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('earn','redeem','expire','adjust') NOT NULL,
  points INT NOT NULL,
  balance_after INT UNSIGNED NOT NULL,
  ref_type VARCHAR(50) DEFAULT NULL,
  ref_id BIGINT UNSIGNED DEFAULT NULL,
  description VARCHAR(500) DEFAULT NULL,
  expires_at DATE DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_lpl_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE support_tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_code VARCHAR(30) NOT NULL,
  requester_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED DEFAULT NULL,
  category ENUM('booking_issue','payment','property','account','other') NOT NULL,
  subject VARCHAR(500) NOT NULL,
  status ENUM('open','in_progress','pending_customer','resolved','closed') NOT NULL DEFAULT 'open',
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  assigned_to BIGINT UNSIGNED DEFAULT NULL,
  resolved_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_ticket_code (ticket_code),
  CONSTRAINT fk_tick_req FOREIGN KEY (requester_id) REFERENCES users (id),
  CONSTRAINT fk_tick_book FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE SET NULL,
  CONSTRAINT fk_tick_agent FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE ticket_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  is_internal TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_tm_tick FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_sender FOREIGN KEY (sender_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE disputes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  raised_by BIGINT UNSIGNED NOT NULL,
  dispute_type ENUM('cancellation','refund','property_issue','no_show','other') NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open','under_review','resolved','closed') NOT NULL DEFAULT 'open',
  resolution TEXT DEFAULT NULL,
  resolved_by BIGINT UNSIGNED DEFAULT NULL,
  resolved_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_disp_book FOREIGN KEY (booking_id) REFERENCES bookings (id),
  CONSTRAINT fk_disp_raised FOREIGN KEY (raised_by) REFERENCES users (id),
  CONSTRAINT fk_disp_resolv FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_role_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_perm_act_res (action, resource)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  scope_type VARCHAR(50) DEFAULT NULL,
  scope_value VARCHAR(100) DEFAULT NULL,
  granted_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_ur_scope (user_id, role_id, scope_type, scope_value),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_grant FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE staff_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  employee_code VARCHAR(50) NOT NULL,
  department ENUM('engineering','customer_service','finance','operations','marketing','management') NOT NULL,
  job_title VARCHAR(200) NOT NULL,
  region_scope VARCHAR(200) DEFAULT NULL,
  city_scope JSON DEFAULT NULL,
  manager_id BIGINT UNSIGNED DEFAULT NULL,
  joined_at DATE DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_staff_user (user_id), UNIQUE KEY uq_staff_emp (employee_code),
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_mgr FOREIGN KEY (manager_id) REFERENCES staff_profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  old_values JSON DEFAULT NULL,
  new_values JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE system_configs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  config_key VARCHAR(200) NOT NULL,
  config_value TEXT NOT NULL,
  value_type ENUM('string','integer','decimal','boolean','json') NOT NULL DEFAULT 'string',
  group_name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  updated_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_syscfg_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(100) NOT NULL,
  channel ENUM('in_app','email','sms','push') NOT NULL DEFAULT 'in_app',
  title VARCHAR(500) NOT NULL,
  body TEXT DEFAULT NULL,
  data JSON DEFAULT NULL,
  entity_type VARCHAR(50) DEFAULT NULL,
  entity_id BIGINT UNSIGNED DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME DEFAULT NULL,
  sent_at DATETIME DEFAULT NULL,
  failed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE risk_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rule_code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  risk_weight DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_risk_rule_code (rule_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE risk_assessments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  decision ENUM('approve','flagged','review','reject') NOT NULL DEFAULT 'flagged',
  triggered_rules JSON DEFAULT NULL,
  reviewed_by BIGINT UNSIGNED DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_risk_pay (payment_id),
  CONSTRAINT fk_risk_pay FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE CASCADE,
  CONSTRAINT fk_risk_book FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
  CONSTRAINT fk_risk_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_risk_rev FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE voucher_usages 
ADD INDEX idx_vu_booking (booking_id);

ALTER TABLE bookings
ADD CONSTRAINT chk_booking_dates CHECK (check_in_date < check_out_date),
ADD CONSTRAINT chk_booking_nights CHECK (num_nights = DATEDIFF(check_out_date, check_in_date)),
ADD CONSTRAINT chk_booking_total CHECK (total_amount >= 0);

ALTER TABLE payments
ADD CONSTRAINT chk_payment_amount CHECK (amount > 0);

ALTER TABLE daily_rates
ADD CONSTRAINT chk_daily_rate_price CHECK (price >= 0);

-- Fix 4: Index cho audit_logs
ALTER TABLE audit_logs
ADD INDEX idx_audit_entity (entity_type, entity_id),
ADD INDEX idx_audit_actor (actor_id),
ADD INDEX idx_audit_created (created_at);

-- Fix 5: Index cho notifications (Rất quan trọng cho performance)
ALTER TABLE notifications
ADD INDEX idx_notif_user_read (user_id, is_read, created_at),
ADD INDEX idx_notif_entity (entity_type, entity_id);

-- Fix 7: Index cho payments (Phục vụ báo cáo)
ALTER TABLE payments
ADD INDEX idx_pay_status_method (status, payment_method),
ADD INDEX idx_pay_created (created_at);

-- Fix 8: Bổ sung index tìm kiếm Properties
ALTER TABLE properties
ADD INDEX idx_prop_rating (status, avg_rating),
ADD INDEX idx_prop_location (latitude, longitude);

-- Thêm các cột mới vào bảng property_policies
ALTER TABLE property_policies
-- 1. Nhận / Trả phòng nâng cao (Check-in / Check-out)
ADD COLUMN check_out_from TIME DEFAULT '00:00:00' AFTER check_in_until,
ADD COLUMN early_check_in_allowed TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN early_check_in_fee DECIMAL(12,2) DEFAULT NULL COMMENT 'Phụ phí nhận phòng sớm (VNĐ)',
ADD COLUMN late_check_out_allowed TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN late_check_out_fee DECIMAL(12,2) DEFAULT NULL COMMENT 'Phụ phí trả phòng muộn (VNĐ)',
-- 2. Trẻ em (Cụ thể hóa độ tuổi)
ADD COLUMN min_child_age TINYINT UNSIGNED DEFAULT 0 COMMENT 'Độ tuổi tối thiểu được lưu trú',
ADD COLUMN infant_0_4_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Phụ thu trẻ 0-4t',
ADD COLUMN free_baby_cot TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Hỗ trợ nôi/cũi miễn phí',
ADD COLUMN child_5_11_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Phụ thu trẻ 5-11t',
ADD COLUMN child_5_11_must_use_extra_bed TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Trẻ 5-11t bắt buộc dùng giường phụ',
-- 3. Vắng mặt (No-show)
ADD COLUMN no_show_penalty_type ENUM('full_amount','first_night','percent') NOT NULL DEFAULT 'full_amount',
ADD COLUMN no_show_penalty_value DECIMAL(12,2) DEFAULT NULL COMMENT 'Giá trị phạt tương ứng với type',
-- 4. Đặt phòng & Thanh toán
ADD COLUMN instant_confirmation TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: Tự động duyệt, 0: Host phải duyệt',
ADD COLUMN deposit_required TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN deposit_type ENUM('percent','fixed_amount') DEFAULT NULL,
ADD COLUMN deposit_value DECIMAL(12,2) DEFAULT NULL,
ADD COLUMN deposit_days_before SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Số ngày phải cọc trước khi check-in',
ADD COLUMN accepted_payment_methods JSON DEFAULT NULL COMMENT 'Mảng: ["cash", "credit_card", "transfer"]',
-- 5. Khách lưu trú
ADD COLUMN extra_person_fee DECIMAL(12,2) DEFAULT NULL COMMENT 'Phụ phí thêm người (vượt tiêu chuẩn)',
-- 6. Dịch vụ & Tiện ích (Bổ sung phần phí)
ADD COLUMN wifi_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN breakfast_included TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN breakfast_fee DECIMAL(12,2) DEFAULT NULL,
ADD COLUMN airport_shuttle_available TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN airport_shuttle_fee DECIMAL(12,2) DEFAULT NULL,
ADD COLUMN parking_type ENUM('free','paid','none') NOT NULL DEFAULT 'none',
ADD COLUMN parking_fee DECIMAL(12,2) DEFAULT NULL,
-- 7. Quy định Hành vi (House Rules)
ADD COLUMN smoking_penalty DECIMAL(12,2) DEFAULT NULL COMMENT 'Phạt hút thuốc sai quy định',
ADD COLUMN pet_fee DECIMAL(12,2) DEFAULT NULL COMMENT 'Phí mang thú cưng',
ADD COLUMN pet_max_weight_kg DECIMAL(5,2) DEFAULT NULL COMMENT 'Cân nặng tối đa của thú cưng',
ADD COLUMN parties_allowed TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Cho phép tổ chức tiệc',
ADD COLUMN quiet_hours_start TIME DEFAULT NULL COMMENT 'Giờ bắt đầu giữ yên lặng',
ADD COLUMN quiet_hours_end TIME DEFAULT NULL COMMENT 'Giờ kết thúc giữ yên lặng',
ADD COLUMN requires_marriage_certificate TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Cần giấy ĐKKH cho khách Việt - Ngoại',
-- 8. Rủi ro & Bồi thường
ADD COLUMN damage_deposit_required TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN damage_deposit_amount DECIMAL(12,2) DEFAULT NULL COMMENT 'Tiền cọc hư hỏng thu lúc check-in',
ADD COLUMN liability_waiver TEXT DEFAULT NULL COMMENT 'Miễn trừ trách nhiệm tài sản',
ADD COLUMN force_majeure_policy TEXT DEFAULT NULL COMMENT 'Chính sách bất khả kháng';
SET FOREIGN_KEY_CHECKS = 1;
