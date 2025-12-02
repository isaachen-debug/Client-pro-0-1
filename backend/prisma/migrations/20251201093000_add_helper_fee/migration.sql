-- Add helperFee column to appointments
ALTER TABLE "Appointment"
ADD COLUMN "helperFee" DOUBLE PRECISION DEFAULT 0;

