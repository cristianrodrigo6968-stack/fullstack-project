import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],

    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx",
    ],

    exclude: [
      "tests/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],

      // Alcance actual del Quality Gate:
      // archivos cubiertos por las pruebas de la Sesión 3.
      include: [
        "src/components/FormularioTarea.tsx",
        "src/utils/validaciones.ts",
      ],

      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});