const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://taskmanager_db_4xrr_user:yYdDApoUdvKT0bWrQvdZvrN3kK4C9Lkh@dpg-d86eu0dckfvc73cluv90-a.ohio-postgres.render.com/taskmanager_db_4xrr"
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