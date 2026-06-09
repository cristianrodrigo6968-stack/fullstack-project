import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { username: "admin", password: "1234" },
    { username: "usuario2", password: "pass2" },
    { username: "usuario3", password: "pass3" },
    { username: "usuario4", password: "pass4" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    });
  }

  console.log("✅ Usuarios creados");
}

main().finally(() => prisma.$disconnect());
