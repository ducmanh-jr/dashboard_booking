-- Speed up per-night availability checks by property, room label, date range, and status.

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'bookings' AND index_name = 'idx_bookings_availability') = 0,
  'ALTER TABLE bookings ADD INDEX idx_bookings_availability (property_id, price_label, check_in_date, check_out_date, status, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
