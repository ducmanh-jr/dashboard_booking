-- Per-day partner overrides for room price, sellable inventory, and close/open status.

CREATE TABLE IF NOT EXISTS property_pricing_daily_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  pricing_id BIGINT UNSIGNED NOT NULL,
  stay_date DATE NOT NULL,
  price_per_night DECIMAL(12,2) NULL,
  open_inventory INT UNSIGNED NULL,
  is_closed TINYINT(1) NOT NULL DEFAULT 0,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pricing_daily_override (pricing_id, stay_date),
  KEY idx_daily_override_property_date (property_id, stay_date),
  CONSTRAINT fk_daily_override_property FOREIGN KEY (property_id)
    REFERENCES properties (id) ON DELETE CASCADE,
  CONSTRAINT fk_daily_override_pricing FOREIGN KEY (pricing_id)
    REFERENCES property_pricing (id) ON DELETE CASCADE,
  CONSTRAINT fk_daily_override_user FOREIGN KEY (updated_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
