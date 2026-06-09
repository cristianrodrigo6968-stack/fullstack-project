import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || "tu-correo@gmail.com",
    pass: process.env.EMAIL_PASS || "tu-contraseña-de-aplicacion",
  },
  // family: 4,  // ← ELIMINA ESTA LÍNEA (no es válida en TypeScript)
});

interface DatosCredenciales {
  email: string;
  nombreCompleto: string;
  username: string;
  password: string;
  linkPortal: string;
}

export async function enviarCorreo(datos: DatosCredenciales): Promise<void> {
  const { email, nombreCompleto, username, password, linkPortal } = datos;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .header { background: #1e3a5f; color: white; padding: 28px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; letter-spacing: 1px; text-transform: uppercase; }
    .body { padding: 28px; color: #1e293b; }
    .body p { line-height: 1.7; margin: 0 0 16px; font-size: 14px; }
    .credentials { background: #f0f7ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
    .credentials p { margin: 6px 0; font-size: 14px; }
    .credentials strong { color: #1e3a5f; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin: 16px 0 0; }
    .footer { background: #f8fafc; padding: 16px 28px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Asociación de Escritores<br>Vanguardistas 3.0</h1>
      <p>El Alto · Bolivia</p>
    </div>
    <div class="body">
      <p>Estimado/a <strong>${nombreCompleto}</strong>,</p>
      <p>Gracias por registrarte en nuestra asociación. Tus credenciales de acceso al portal del cliente ya están listas:</p>

      <div class="credentials">
        <p><strong>👤 Usuario:</strong> ${username}</p>
        <p><strong>🔑 Contraseña:</strong> ${password}</p>
      </div>

      <p>Ingresa al siguiente enlace para hacer seguimiento de tus publicaciones, subir contenido y comunicarte con el equipo editorial:</p>

      <a href="${linkPortal}" class="btn">📋 Ir al Portal del Cliente</a>

      <p style="margin-top: 24px; font-size: 12px; color: #64748b;">Por seguridad, te recomendamos cambiar tu contraseña al iniciar sesión. Si tienes alguna duda, responde este correo o contáctanos por WhatsApp.</p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Asociación de Escritores Vanguardistas 3.0 — El Alto, Bolivia.<br>
      Este correo fue generado automáticamente.
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Asociación de Escritores" <${process.env.EMAIL_USER || "no-reply@vanguardistas3.com"}>`,
    to: email,
    subject: "Tus credenciales de acceso — Asociación de Escritores Vanguardistas 3.0",
    html,
  });
}