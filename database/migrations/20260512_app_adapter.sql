-- Adapter for database/3.8.sql so the current app can run without changing 3.8.sql.
-- This file is idempotent and is executed by backend/src/databasePatches.js.

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO roles (name, slug, description, is_system)
VALUES ('Administrator', 'admin', 'Quan tri vien he thong', 1)
ON DUPLICATE KEY UPDATE description = VALUES(description);

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'partner_profiles' AND column_name = 'reject_reason') = 0,
  'ALTER TABLE partner_profiles ADD COLUMN reject_reason TEXT NULL AFTER kyc_status',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE properties
  MODIFY COLUMN property_type VARCHAR(100) NOT NULL,
  MODIFY COLUMN status ENUM('draft','pending_review','active','suspended','rejected') NOT NULL DEFAULT 'pending_review';

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'capacity') = 0,
  'ALTER TABLE properties ADD COLUMN capacity TINYINT UNSIGNED NOT NULL DEFAULT 2 AFTER area_sqm',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'reject_reason') = 0,
  'ALTER TABLE properties ADD COLUMN reject_reason TEXT NULL AFTER capacity',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'platform_fee_pct') = 0,
  'ALTER TABLE properties ADD COLUMN platform_fee_pct TINYINT UNSIGNED NOT NULL DEFAULT 10 AFTER reject_reason',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'promotion_pct') = 0,
  'ALTER TABLE properties ADD COLUMN promotion_pct TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER platform_fee_pct',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'amenities_json') = 0,
  'ALTER TABLE properties ADD COLUMN amenities_json JSON NULL AFTER promotion_pct',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'highlights_json') = 0,
  'ALTER TABLE properties ADD COLUMN highlights_json JSON NULL AFTER amenities_json',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'transport_connections_json') = 0,
  'ALTER TABLE properties ADD COLUMN transport_connections_json JSON NULL AFTER highlights_json',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS property_pricing (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(64) NOT NULL,
  price_per_night DECIMAL(12,2) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  area_sqm DECIMAL(6,2) NULL,
  capacity TINYINT UNSIGNED NULL,
  bed_info VARCHAR(255) NULL,
  amenities TEXT NULL,
  image_urls_json JSON NULL,
  total_inventory INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_property_label (property_id, label),
  KEY idx_pricing_property (property_id),
  CONSTRAINT fk_pricing_property FOREIGN KEY (property_id)
    REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS property_nearby_places (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  distance_m INT UNSIGNED NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_nearby_property (property_id),
  CONSTRAINT fk_nearby_property FOREIGN KEY (property_id)
    REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS property_gallery_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(64) NOT NULL,
  image_url MEDIUMTEXT NOT NULL,
  caption VARCHAR(255) NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_property_gallery_images_property (property_id, sort_order),
  CONSTRAINT fk_property_gallery_images_property FOREIGN KEY (property_id)
    REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'property_policies' AND column_name = 'cancellation_policy_text') = 0,
  'ALTER TABLE property_policies ADD COLUMN cancellation_policy_text TEXT NULL AFTER free_cancel_hours',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'property_policies' AND column_name = 'children_free_age') = 0,
  'ALTER TABLE property_policies ADD COLUMN children_free_age TINYINT UNSIGNED NULL AFTER children_allowed',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE bookings
  MODIFY COLUMN status ENUM('pending','confirmed','checked_in','checked_out','cancelled','no_show','refunded') NOT NULL DEFAULT 'pending';

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'bookings' AND column_name = 'price_label') = 0,
  'ALTER TABLE bookings ADD COLUMN price_label VARCHAR(64) NULL AFTER property_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS property_change_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  partner_id BIGINT UNSIGNED NOT NULL,
  action_type ENUM('update','delete') NOT NULL,
  payload_json JSON NULL,
  requested_by BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  review_note TEXT NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_property_change_requests_property (property_id, status),
  KEY idx_property_change_requests_partner (partner_id, status),
  CONSTRAINT fk_pcr_property FOREIGN KEY (property_id)
    REFERENCES properties (id) ON DELETE CASCADE,
  CONSTRAINT fk_pcr_partner FOREIGN KEY (partner_id)
    REFERENCES partner_profiles (id) ON DELETE CASCADE,
  CONSTRAINT fk_pcr_requested_by FOREIGN KEY (requested_by)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_pcr_reviewed_by FOREIGN KEY (reviewed_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mock_payment_otps (
  booking_id BIGINT UNSIGNED NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (booking_id),
  CONSTRAINT fk_mpo_booking FOREIGN KEY (booking_id)
    REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;