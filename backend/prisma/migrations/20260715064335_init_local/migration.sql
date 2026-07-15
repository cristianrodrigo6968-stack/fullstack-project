-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "TareaItem" (
    "id" SERIAL NOT NULL,
    "itemPedidoId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "vistaCliente" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TareaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComentarioTarea" (
    "id" SERIAL NOT NULL,
    "tareaId" INTEGER NOT NULL,
    "autorTipo" TEXT NOT NULL,
    "texto" TEXT,
    "archivos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComentarioTarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionAdmin" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "dispositivo" TEXT NOT NULL,
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaActividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SesionAdmin_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TareaItem" ADD CONSTRAINT "TareaItem_itemPedidoId_fkey" FOREIGN KEY ("itemPedidoId") REFERENCES "ItemPedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComentarioTarea" ADD CONSTRAINT "ComentarioTarea_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "TareaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionAdmin" ADD CONSTRAINT "SesionAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
