// pdfGenerator.ts
import pdf from 'html-pdf';

export interface ReciboData {
  cliente: {
    nombreCompleto: string;
    ci: string;
    celular: string;
    email: string;
  };
  pedido: {
    id: number;
    montoTotal: number;
    montoPagado: number;
    saldoPendiente: number;
    fecha: Date;
  };
  items: Array<{
    titulo: string;
    tipo: string;
    precioUnitario: number;
  }>;
  credenciales?: {
    username: string;
    password: string;
  };
}

export function generarReciboPDF(data: ReciboData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const logoUrl = process.env.LOGO_URL || '';
    const fechaFormateada = data.pedido.fecha.toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const initials = data.cliente.nombreCompleto
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();

    const saldo = data.pedido.saldoPendiente;
    const estadoPago =
      saldo <= 0
        ? { label: 'PAGADO', color: '#16a34a', bg: '#dcfce7' }
        : saldo < data.pedido.montoTotal
        ? { label: 'PAGO PARCIAL', color: '#d97706', bg: '#fef3c7' }
        : { label: 'PENDIENTE', color: '#dc2626', bg: '#fee2e2' };

    const saldoColor = saldo <= 0 ? '#16a34a' : '#dc2626';
    const saldoBorder = saldo <= 0 ? '#bbf7d0' : '#fecaca';

    const itemRows = data.items
      .map(
        (item, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 12px 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0; font-size: 14px;">
          ${item.titulo}
          <span style="
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #155f96;
            background: #dbeafe;
            padding: 2px 8px;
            border-radius: 4px;
            margin-left: 8px;
          ">${item.tipo}</span>
        </td>
        <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; font-size: 14px;">
          Bs ${item.precioUnitario.toFixed(2)}
        </td>
      </tr>
    `
      )
      .join('');

    const MIN_ROWS = 5;
    const emptyRows = Array.from({ length: Math.max(0, MIN_ROWS - data.items.length) })
      .map(
        () => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">&nbsp;</td>
        <td style="border-bottom: 1px solid #f1f5f9;">&nbsp;</td>
      </tr>
    `
      )
      .join('');

    const credencialesHtml = data.credenciales
      ? `
      <div style="margin-top: 24px; background: #eef2ff; border-left: 6px solid #3b82f6; padding: 16px 20px; border-radius: 12px;">
        <p style="font-size: 16px; font-weight: bold; color: #1e3a5f; margin-bottom: 10px;">🔐 Tus credenciales de acceso</p>
        <p style="font-size: 14px; margin: 6px 0;"><strong>Usuario:</strong> ${data.credenciales.username}</p>
        <p style="font-size: 14px; margin: 6px 0;"><strong>Contraseña:</strong> ${data.credenciales.password}</p>
        <p style="font-size: 12px; color: #4b5563; margin-top: 8px;">Guarda esta información para ingresar a tu portal.</p>
      </div>
    `
      : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recibo #${String(data.pedido.id).padStart(4, '0')} — Vanguardistas 3.0</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #1e293b;
      font-size: 14px;
      line-height: 1.5;
    }
    .header {
      background: #0b3a5e;
      padding: 24px 30px 20px;
      border-bottom: 6px solid #f59e0b;
    }
    .logo-wrap {
      display: inline-block;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 6px;
      margin-right: 16px;
      vertical-align: middle;
    }
    .logo {
      width: 70px;
      height: 70px;
      object-fit: contain;
      display: block;
    }
    .org-name {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      display: inline-block;
      vertical-align: middle;
    }
    .org-sub {
      font-size: 11px;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.05em;
      margin-top: 4px;
    }
    .rlabel {
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.5);
    }
    .rnum {
      font-size: 32px;
      font-weight: 700;
      color: #f59e0b;
      line-height: 1.2;
    }
    .rfecha {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
    }
    .estado-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 30px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-top: 8px;
      background: ${estadoPago.bg};
      color: ${estadoPago.color};
    }
    .section-title {
      font-size: 12px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 10px;
      margin-top: 20px;
    }
    .cliente-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #0b3a5e;
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
      text-align: center;
      line-height: 48px;
      display: inline-block;
    }
    .cliente-nombre {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    .ci-badge {
      display: inline-block;
      background: #e2e8f0;
      color: #1e293b;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      margin-left: 8px;
    }
    .cliente-meta {
      font-size: 13px;
      color: #475569;
      margin-top: 4px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .items-table thead tr {
      background: #0b3a5e;
    }
    .items-table thead th {
      padding: 10px 16px;
      font-weight: 600;
      text-align: left;
      color: #ffffff;
      font-size: 12px;
      letter-spacing: 0.05em;
    }
    .items-table thead th.right {
      text-align: right;
    }
    .totales-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-top: 24px;
    }
    .tot-table {
      width: 100%;
      border-collapse: collapse;
    }
    .tot-table td {
      padding: 8px 0;
      font-size: 14px;
      color: #334155;
      border-bottom: 1px dashed #cbd5e1;
    }
    .tot-table tr:last-child td {
      border-bottom: none;
      border-top: 2px solid ${saldoBorder};
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
      color: ${saldoColor};
    }
    .tot-table td.right {
      text-align: right;
    }
    .nota {
      text-align: center;
      font-size: 12px;
      color: #64748b;
      font-style: italic;
      margin-top: 24px;
    }
    .sello {
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 8px 0;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      margin: 16px auto 0;
      width: 60%;
    }
    .footer {
      background: #0b3a5e;
      padding: 16px 30px;
      border-top: 4px solid #f59e0b;
      margin-top: 30px;
    }
    .fbrand {
      font-size: 14px;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
    }
    .footer p {
      font-size: 11px;
      color: rgba(255,255,255,0.5);
      line-height: 1.4;
    }
    .footer a {
      color: #f59e0b;
      text-decoration: none;
    }
    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0 0;
    }
    .spacer {
      height: 20px;
    }
    .content {
      padding: 0 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="width:70%;">
          ${
            logoUrl
              ? `<div class="logo-wrap"><img class="logo" src="${logoUrl}" alt="Logo" /></div>`
              : ''
          }
          <div style="display:inline-block; vertical-align:middle;">
            <div class="org-name">Asociación de Escritores<br>Vanguardistas 3.0</div>
            <div class="org-sub">El Alto, Bolivia</div>
          </div>
        </td>
        <td style="width:30%; text-align:right;">
          <div class="rlabel">Recibo de Pago</div>
          <div class="rnum">#${String(data.pedido.id).padStart(4, '0')}</div>
          <div class="rfecha">${fechaFormateada}</div>
          <div class="estado-badge">${estadoPago.label}</div>
        </td>
      </tr>
    </table>
  </div>

  <div class="content">
    <div class="section-title">Datos del cliente</div>
    <div class="cliente-box">
      <table style="width:100%">
        <tr>
          <td style="width:60px;"><div class="avatar">${initials}</div></td>
          <td>
            <div class="cliente-nombre">
              ${data.cliente.nombreCompleto}
              <span class="ci-badge">CI ${data.cliente.ci}</span>
            </div>
            <div class="cliente-meta">
              Celular: ${data.cliente.celular} | Email: ${data.cliente.email}
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div class="section-title">Detalle del pedido</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>Producto / Servicio</th>
          <th class="right">Precio Unit.</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${emptyRows}
      </tbody>
    </table>

    <div class="totales-box">
      <table class="tot-table">
        <tr>
          <td>Total del pedido</td>
          <td class="right">Bs ${data.pedido.montoTotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Monto pagado</td>
          <td class="right" style="color:#16a34a;">− Bs ${data.pedido.montoPagado.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Saldo pendiente</td>
          <td class="right">Bs ${data.pedido.saldoPendiente.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    ${credencialesHtml}

    <hr class="divider" />
    <div class="nota">
      ¡Gracias por confiar en <strong>Vanguardistas 3.0</strong>!<br>
      Este documento es válido como comprobante de pago.
    </div>
    <div class="sello">Documento generado electrónicamente · No requiere firma física</div>
    <div class="spacer"></div>
  </div>

  <div class="footer">
    <table style="width:100%">
      <tr>
        <td>
          <div class="fbrand">Vanguardistas 3.0</div>
          <p>El Alto, Bolivia · <a href="mailto:xd@vanguardistas.com">xd@vanguardistas.com</a><br>Tel: +591 71234567</p>
        </td>
        <td style="text-align:right;">
          <p>© 2026 Todos los derechos reservados</p>
          <p style="font-size:9px;">Recibo generado automáticamente</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

    const options = {
      format: 'Letter' as const,
      border: {
        top: '0.3in',
        right: '0.4in',
        bottom: '0.3in',
        left: '0.4in',
      },
      type: 'pdf' as const,
      quality: '100',
    };

    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}