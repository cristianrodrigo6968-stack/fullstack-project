/*
  Warnings:

  - A unique constraint covering the columns `[pedidoId]` on the table `Pago` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "pedidoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Pago_pedidoId_key" ON "Pago"("pedidoId");

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
