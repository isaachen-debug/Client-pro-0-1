-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "invoiceSentAt" DATETIME;
ALTER TABLE "Appointment" ADD COLUMN "invoiceToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_invoiceToken_key" ON "Appointment"("invoiceToken");

