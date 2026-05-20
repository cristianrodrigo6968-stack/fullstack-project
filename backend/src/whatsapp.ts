import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID || "",
  process.env.TWILIO_AUTH_TOKEN || ""
);

const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || ""}`;

/**
 * Envía un mensaje de WhatsApp al cliente con sus credenciales.
 */
export async function enviarWhatsAppCliente(
  celular: string,
  nombreCompleto: string,
  username: string,
  password: string,
  linkPortal: string
): Promise<void> {
  if (!celular) {
    console.warn("No se envió WhatsApp: falta número de celular.");
    return;
  }

  // Asegurar formato internacional (ej: +591XXXXXXXX)
  const numero = celular.startsWith("+") ? celular : `+591${celular}`;

  const mensaje = `Hola ${nombreCompleto}, tus credenciales de acceso son:\n👤 Usuario: ${username}\n🔑 Contraseña: ${password}\nIngresa en: ${linkPortal}`;

  try {
    await client.messages.create({
      from,
      to: `whatsapp:${numero}`,
      body: mensaje,
    });
  } catch (err) {
    console.error("Error al enviar WhatsApp al cliente:", err);
  }
}

/**
 * Envía una notificación al admin cuando un cliente envía un mensaje.
 */
export async function notificarAdminMensaje(
  nombreCliente: string
): Promise<void> {
  const adminNumero = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumero) {
    console.warn("No se envió notificación: falta ADMIN_WHATSAPP_NUMBER.");
    return;
  }

  const mensaje = `📩 Tienes un mensaje nuevo en el chat de la Asociación de Escritores Vanguardistas de: ${nombreCliente}`;

  try {
    await client.messages.create({
      from,
      to: `whatsapp:${adminNumero}`,
      body: mensaje,
    });
  } catch (err) {
    console.error("Error al notificar al admin:", err);
  }
}