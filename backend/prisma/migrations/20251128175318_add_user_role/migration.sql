-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'HELPER', 'CLIENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'OWNER';
