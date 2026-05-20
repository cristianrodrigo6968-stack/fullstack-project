const { execSync } = require('child_process');

process.env.DATABASE_URL = "postgresql://taskmanager_db_4xrr_user:yYdDApoUdvKT0bWrQvdZvrN3kK4C9Lkh@dpg-d86eu0dckfvc73cluv90-a.ohio-postgres.render.com/taskmanager_db_4xrr";

console.log("Ejecutando prisma db push...");
execSync('npx prisma db push', { stdio: 'inherit' });
console.log("Ejecutando prisma generate...");
execSync('npx prisma generate', { stdio: 'inherit' });
console.log("Migración completada.");