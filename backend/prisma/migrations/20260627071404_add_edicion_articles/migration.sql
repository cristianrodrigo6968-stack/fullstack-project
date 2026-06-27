-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "edicionId" INTEGER;

-- AlterTable
ALTER TABLE "Edicion" ADD COLUMN     "archivoUrl" TEXT;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "Edicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
