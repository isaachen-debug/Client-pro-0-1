-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "recurrenceSeriesId" TEXT;

-- CreateIndex
CREATE INDEX "Appointment_recurrenceSeriesId_idx" ON "Appointment"("recurrenceSeriesId");

-- Backfill existing recurring appointments so they share a deterministic series id
UPDATE "Appointment"
SET "recurrenceSeriesId" = 
    CASE
        WHEN "recurrenceRule" IS NOT NULL THEN
            CONCAT("userId", ':', COALESCE("customerId", ''), ':', COALESCE("startTime", ''), ':', COALESCE("recurrenceRule", 'NONE'))
        ELSE "id"
    END
WHERE ("recurrenceRule" IS NOT NULL OR "isRecurring" = TRUE)
  AND "recurrenceSeriesId" IS NULL;

WITH grouped AS (
    SELECT
        id,
        "userId",
        "customerId",
        "startTime",
        price,
        COUNT(*) OVER (PARTITION BY "userId", "customerId", "startTime", price) AS cnt,
        MIN(id) OVER (PARTITION BY "userId", "customerId", "startTime", price) AS base_id
    FROM "Appointment"
    WHERE "recurrenceSeriesId" IS NULL
)
UPDATE "Appointment" AS a
SET "recurrenceSeriesId" = grouped.base_id
FROM grouped
WHERE a.id = grouped.id
  AND grouped.cnt > 1
  AND a."recurrenceSeriesId" IS NULL;
