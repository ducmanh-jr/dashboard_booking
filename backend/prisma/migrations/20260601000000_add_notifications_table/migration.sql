-- CreateTable: notifications
-- Bảng này lưu thông báo in-app cho admin và đối tác
-- Được tạo bởi migration 20260601000000_add_notifications_table

CREATE TABLE "notifications" (
    "id"          BIGSERIAL NOT NULL,
    "user_id"     BIGINT NOT NULL,
    "type"        VARCHAR(100) NOT NULL,
    "channel"     VARCHAR(50) NOT NULL DEFAULT 'in_app',
    "title"       VARCHAR(500) NOT NULL,
    "body"        TEXT,
    "data"        JSONB NOT NULL DEFAULT '{}',
    "entity_type" VARCHAR(100),
    "entity_id"   BIGINT,
    "is_read"     BOOLEAN NOT NULL DEFAULT false,
    "read_at"     TIMESTAMP(6),
    "created_at"  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Index: tìm kiếm theo user + chưa đọc (query thường dùng nhất)
CREATE INDEX "idx_notif_user_unread" ON "notifications"("user_id", "is_read");

-- Index: sắp xếp theo thời gian tạo
CREATE INDEX "idx_notif_user_created" ON "notifications"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "notifications"
    ADD CONSTRAINT "fk_notif_user"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
