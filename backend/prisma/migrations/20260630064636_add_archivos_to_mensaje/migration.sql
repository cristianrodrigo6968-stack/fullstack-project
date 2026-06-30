-- AlterTable
ALTER TABLE "Mensaje" ADD COLUMN     "archivos" TEXT[] DEFAULT ARRAY[]::TEXT[];
