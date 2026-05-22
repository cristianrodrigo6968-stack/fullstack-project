const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://taskmanager_db_c9f7_user:Jl4sOg7MzLWQ29dLofsAMfJ6hakHQldu@dpg-d873brh9rddc73836lmg-a.oregon-postgres.render.com/taskmanager_db_c9f7"
    }
  }
});

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: '1234',
      role: 'admin'
    }
  });
  console.log('✅ Usuario admin creado:', admin.username);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});