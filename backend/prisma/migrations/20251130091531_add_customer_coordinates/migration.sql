-- Add latitude and longitude columns to store geocoded coordinates
ALTER TABLE "Customer"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

