/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // agrega aquí otras variables de entorno que uses en el frontend
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}