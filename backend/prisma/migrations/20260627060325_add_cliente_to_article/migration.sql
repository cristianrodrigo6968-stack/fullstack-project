-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "clienteId" INTEGER;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
