-- AlterTable
ALTER TABLE "ItemPedido" ADD COLUMN     "edicionId" INTEGER;

-- CreateTable
CREATE TABLE "Edicion" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "magazineId" INTEGER NOT NULL,

    CONSTRAINT "Edicion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Edicion" ADD CONSTRAINT "Edicion_magazineId_fkey" FOREIGN KEY ("magazineId") REFERENCES "Magazine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "Edicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
