-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "sexo" TEXT;

-- CreateTable
CREATE TABLE "DayNote" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "DayNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibroDetalle" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "numeroLibro" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "isbn" BOOLEAN NOT NULL DEFAULT false,
    "senapi" BOOLEAN NOT NULL DEFAULT false,
    "prioridad" TEXT NOT NULL,

    CONSTRAINT "LibroDetalle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DayNote" ADD CONSTRAINT "DayNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibroDetalle" ADD CONSTRAINT "LibroDetalle_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
