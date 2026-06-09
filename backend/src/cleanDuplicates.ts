import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const entregas = await prisma.entrega.findMany({
    orderBy: { id: "asc" },
  });

  const seen = new Set<number>();

  for (const e of entregas) {
    const key = e.clienteId;
    if (key && seen.has(key)) {
      await prisma.entrega.delete({ where: { id: e.id } });
      console.log(`Eliminada entrega duplicada ID: ${e.id}`);
    } else if (key) {
      seen.add(key);
    }
  }

  console.log("✅ Listo");
}

main().finally(() => prisma.$disconnect());
