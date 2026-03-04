-- DropIndex
DROP INDEX "public"."Player_name_key";

-- CreateIndex
CREATE INDEX "Player_name_idx" ON "Player"("name");

-- CreateIndex
CREATE INDEX "Player_location_idx" ON "Player"("location");
