/*
  Warnings:

  - A unique constraint covering the columns `[ci,extension]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Client_ci_extension_key" ON "Client"("ci", "extension");
