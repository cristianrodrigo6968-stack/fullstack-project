# Task Manager React

Aplicación web full stack desarrollada con React, TypeScript, Node.js y PostgreSQL. Permite gestionar usuarios, clientes, productos, contenidos editoriales, pagos, entregas y procesos administrativos desde una plataforma centralizada.

[![CI](https://github.com/cristianrodrigo6968-stack/fullstack-project/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/cristianrodrigo6968-stack/fullstack-project/actions/workflows/ci.yml)

## Instalación local 🚀

Clona el repositorio:

```bash
git clone https://github.com/cristianrodrigo6968-stack/fullstack-project.git
cd fullstack-project
```

Instala las dependencias del frontend:

```bash
npm install
```

Instala las dependencias del backend:

```bash
cd backend
npm install
cd ..
```

## Variables de entorno

### Frontend

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_API_URL=
```

### Backend

Crea un archivo `.env` dentro de la carpeta `backend`:

```env
DATABASE_URL=
JWT_SECRET=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
CLIENT_PORTAL_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Los archivos de variables de entorno no deben subirse al repositorio. Los valores reales deben mantenerse privados.

## Comandos disponibles 📜

| Ubicación | Comando | Descripción |
|---|---|---|
| Raíz | `npm run dev` | Inicia el frontend en modo de desarrollo |
| Raíz | `npm run build` | Genera el build de producción del frontend |
| Raíz | `npm run lint` | Analiza el código con ESLint |
| Raíz | `npm run preview` | Previsualiza localmente el build del frontend |
| `backend` | `npm run build` | Genera Prisma Client y compila TypeScript |
| `backend` | `npm start` | Inicia el servidor backend compilado |
| Raíz | `npm test` | Ejecutará las pruebas automatizadas, pendiente para la Sesión 3 |

## Ejecución del proyecto

Para iniciar el frontend:

```bash
npm run dev
```

En otra terminal, compila e inicia el backend:

```bash
cd backend
npm run build
npm start
```
## Ejecución con Docker 🐳

La aplicación completa puede ejecutarse mediante Docker Compose, sin instalar manualmente PostgreSQL ni las dependencias de Node.js en el equipo anfitrión.

### Requisitos

- Docker Desktop instalado y funcionando.
- Docker Compose disponible.
- Puertos `3000` y `5173` libres.

Verifica la instalación con:

```bash
docker --version
docker compose version
## Base de datos 🗄️

El proyecto utiliza PostgreSQL como sistema de base de datos. El esquema, las migraciones y los procesos de inicialización de datos se gestionan mediante Prisma.

## Tecnologías principales

- React
- TypeScript
- Vite
- Node.js
- PostgreSQL
- Prisma
- ESLint
- Cloudinary

## Flujo de trabajo con Git

Los cambios del proyecto se desarrollan en ramas independientes y se revisan mediante Pull Requests antes de integrarse a la rama principal.