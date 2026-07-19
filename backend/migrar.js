const { execSync } = require("child_process");

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL no está configurada.");
  process.exit(1);
}

console.log("Ejecutando migraciones de Prisma...");

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: process.env,
});

console.log("Generando Prisma Client...");

execSync("npx prisma generate", {
  stdio: "inherit",
  env: process.env,
});

console.log("Migración completada correctamente.");