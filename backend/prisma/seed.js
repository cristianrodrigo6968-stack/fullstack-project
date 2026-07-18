const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TASK_TITLE = "Tarea de ejemplo para pruebas";

async function main() {
  const existingTask = await prisma.task.findFirst({
    where: {
      title: TASK_TITLE,
    },
  });

  if (existingTask) {
    await prisma.task.update({
      where: {
        id: existingTask.id,
      },
      data: {
        completed: false,
      },
    });

    console.log(
      `Seed reproducible: la tarea ya existía con ID ${existingTask.id}.`
    );

    return;
  }

  const task = await prisma.task.create({
    data: {
      title: TASK_TITLE,
      completed: false,
    },
  });

  console.log(`Seed reproducible: tarea creada con ID ${task.id}.`);
}

main()
  .catch((error) => {
    console.error("Error al ejecutar el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });