-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'pt',
ADD COLUMN     "preferredTheme" TEXT NOT NULL DEFAULT 'light';
