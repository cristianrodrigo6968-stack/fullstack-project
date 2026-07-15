import { test, expect } from '@playwright/test';

test('un administrador puede crear un cliente y verlo en la lista', async ({
  page,
}) => {
  const usuario = process.env.E2E_USER;
  const contrasena = process.env.E2E_PASSWORD;

  if (!usuario || !contrasena) {
    throw new Error(
      'Debes configurar las variables E2E_USER y E2E_PASSWORD',
    );
  }

  const nombreCliente = `Cliente E2E ${Date.now()}`;

  // 1. Entrar al formulario de acceso.
  await page.goto('/login');

  // 2. Completar las credenciales.
  await page.getByPlaceholder('Tu usuario').fill(usuario);
  await page.getByPlaceholder('Tu contraseña').fill(contrasena);

  // 3. Iniciar sesión.
  await page
    .getByRole('button', {
      name: 'Iniciar sesión',
      exact: true,
    })
    .last()
    .click();

  // 4. Verificar el ingreso al panel.
  await expect(page).toHaveURL(/\/admin(?:\/|$)/, {
    timeout: 15000,
  });

  await expect(page.locator('body')).toContainText('admin', {
    timeout: 15000,
  });

  // 5. Abrir la sección Clientes.
  const opcionClientes = page.getByText(/Clientes/i).first();

  await expect(opcionClientes).toBeVisible({
    timeout: 15000,
  });

  await opcionClientes.click();

  // 6. Esperar que aparezca el formulario.
  const campoCliente = page.locator(
    'input[placeholder*="Nombre del cliente"]',
  );

  await expect(campoCliente).toBeVisible({
    timeout: 15000,
  });

  // 7. Crear un nuevo cliente.
  await campoCliente.fill(nombreCliente);

  await page
    .getByRole('button', {
      name: /Nuevo cliente/i,
    })
    .click();

  // 8. Comprobar que aparece en la lista.
  await expect(
    page.getByText(nombreCliente, {
      exact: true,
    }),
  ).toBeVisible({
    timeout: 15000,
  });
});