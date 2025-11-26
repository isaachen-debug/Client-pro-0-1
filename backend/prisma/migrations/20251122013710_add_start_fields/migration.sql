-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN "estimatedDurationMinutes" INTEGER;
ALTER TABLE "Agendamento" ADD COLUMN "finishedAt" DATETIME;
ALTER TABLE "Agendamento" ADD COLUMN "startedAt" DATETIME;
