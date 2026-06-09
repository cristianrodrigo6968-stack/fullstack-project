import { subirArchivo } from "./cloudinary";

// Verificar si las credenciales de Twilio están presentes y son válidas
let twilioClient: any = null;
let from: string = "";

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith("AC") && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = require("twilio");
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  from = process.env.TWILIO_WHATSAPP_NUMBER ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}` : "";
  console.log("✅ Twilio configurado correctamente");
} else {
  console.warn("⚠️ Twilio no configurado. Los mensajes no se enviarán.");
}

export async function enviarWhatsAppCliente(
  celular: string,
  nombreCompleto: string,
  username: string,
  password: string,
  linkPortal: string,
  pdfBuffer?: Buffer,
  pdfFilename?: string
): Promise<void> {
  if (!twilioClient) {
    console.warn("Twilio no disponible, no se envió WhatsApp.");
    return;
  }

  if (!celular) {
    console.warn("No se envió WhatsApp: falta número de celular.");
    return;
  }

  const numero = celular.startsWith("+") ? celular : `+591${celular}`;

  let mensaje = `Hola ${nombreCompleto}, tus credenciales de acceso son:\n👤 Usuario: ${username}\n🔑 Contraseña: ${password}\nIngresa en: ${linkPortal}`;

  let mediaUrl: string | undefined;
  if (pdfBuffer && pdfFilename) {
    try {
      const url = await subirArchivo(pdfBuffer, "recibos", pdfFilename.replace(".pdf", ""));
      mediaUrl = url;
      mensaje += `\n\nAdjunto encontrarás el recibo de tu pedido.`;
    } catch (err) {
      console.error("Error subiendo PDF a Cloudinary:", err);
    }
  }

  try {
    const messageOptions: any = {
      from,
      to: `whatsapp:${numero}`,
      body: mensaje,
    };
    if (mediaUrl) {
      messageOptions.mediaUrl = [mediaUrl];
    }
    await twilioClient.messages.create(messageOptions);
  } catch (err) {
    console.error("Error al enviar WhatsApp al cliente:", err);
  }
}

export async function notificarAdminMensaje(nombreCliente: string): Promise<void> {
  if (!twilioClient) {
    console.warn("Twilio no disponible, no se envió notificación.");
    return;
  }

  const adminNumero = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumero) {
    console.warn("No se envió notificación: falta ADMIN_WHATSAPP_NUMBER.");
    return;
  }

  const mensaje = `📩 Tienes un mensaje nuevo en el chat de la Asociación de Escritores Vanguardistas de: ${nombreCliente}`;

  try {
    await twilioClient.messages.create({
      from,
      to: `whatsapp:${adminNumero}`,
      body: mensaje,
    });
  } catch (err) {
    console.error("Error al notificar al admin:", err);
  }
}
