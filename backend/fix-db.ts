import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Iniciando reparación de base de datos...\n");

  console.log("1/6 Agregando columnas de credenciales...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "clientUsername" VARCHAR(255)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "clientPassword" VARCHAR(255)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "credencialesGeneradaAt" TIMESTAMP`);
  console.log("✅ Columnas agregadas.\n");

  console.log("2/6 Agregando columna updatedAt...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()`);
  console.log("✅ updatedAt agregada.\n");

  console.log("3/6 Rellenando clientUsername únicos...");
  const clientes = await prisma.$queryRawUnsafe(`SELECT id FROM "Client" WHERE "clientUsername" IS NULL`) as any[];
  for (const c of clientes) {
    const username = `cliente_${c.id}`;
    await prisma.$executeRawUnsafe(`UPDATE "Client" SET "clientUsername" = $1 WHERE id = $2`, username, c.id);
    console.log(`  → Cliente ${c.id}: ${username}`);
  }
  console.log("✅ Valores únicos asignados.\n");

  console.log("4/6 Aplicando restricción UNIQUE...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "Client" ADD CONSTRAINT "Client_clientUsername_key" UNIQUE ("clientUsername")`);
  console.log("✅ Restricción UNIQUE aplicada.\n");

  console.log("5/6 Creando tabla Mensaje...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Mensaje" (
      "id" SERIAL PRIMARY KEY,
      "clienteId" INTEGER NOT NULL REFERENCES "Client"("id"),
      "emisor" VARCHAR(10) NOT NULL,
      "texto" TEXT NOT NULL,
      "leido" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✅ Tabla Mensaje creada.\n");

  console.log("6/6 Creando tabla ClienteArchivo...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClienteArchivo" (
      "id" SERIAL PRIMARY KEY,
      "clienteId" INTEGER NOT NULL REFERENCES "Client"("id"),
      "tipo" VARCHAR(20) NOT NULL,
      "referenciaId" INTEGER,
      "titulo" VARCHAR(255),
      "notas" TEXT,
      "archivoUrl" VARCHAR(500),
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✅ Tabla ClienteArchivo creada.\n");

  console.log("🎉 Base de datos reparada exitosamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
  })
  .finally(() => prisma.$disconnect());
