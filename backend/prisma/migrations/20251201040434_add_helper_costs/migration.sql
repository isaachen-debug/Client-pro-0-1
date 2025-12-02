-- CreateEnum
CREATE TYPE "HelperPayoutMode" AS ENUM ('FIXED', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "helperPayoutMode" "HelperPayoutMode" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "helperPayoutValue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "HelperExpense" (
    "id" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "HelperExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HelperExpense_helperId_date_idx" ON "HelperExpense"("helperId", "date");

-- CreateIndex
CREATE INDEX "HelperExpense_ownerId_date_idx" ON "HelperExpense"("ownerId", "date");

-- AddForeignKey
ALTER TABLE "HelperExpense" ADD CONSTRAINT "HelperExpense_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelperExpense" ADD CONSTRAINT "HelperExpense_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
