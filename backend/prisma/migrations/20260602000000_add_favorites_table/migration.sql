-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "property_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_favorite_user_property" ON "public"."favorites"("user_id", "property_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_favorite_user" ON "public"."favorites"("user_id");

-- AddForeignKey
ALTER TABLE "public"."favorites" ADD CONSTRAINT "fk_favorite_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."favorites" ADD CONSTRAINT "fk_favorite_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
