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
    const logoUrl = 'http://localhost:3000/logo.jpg';

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

    const MIN_ROWS = 5;

    const itemRows = data.items.map((item) => `
      <tr>
        <td style="padding:24px 28px; color:#2c3e50; border-bottom:1px solid #eef1f5; font-size:28px;">
          ${item.titulo}
          <span style="
            display:inline-block;
            font-size:20px;
            font-weight:700;
            letter-spacing:.06em;
            text-transform:uppercase;
            color:#155f96;
            background:#dbeafe;
            padding:3px 14px;
            border-radius:6px;
            margin-left:14px;
          ">${item.tipo}</span>
        </td>
        <td style="padding:24px 28px; text-align:right; font-weight:600; color:#2c3e50; border-bottom:1px solid #eef1f5; font-size:28px;">
          Bs ${item.precioUnitario.toFixed(2)}
        </td>
      </tr>`).join('');

    const emptyRows = Array.from({ length: Math.max(0, MIN_ROWS - data.items.length) })
      .map(() => `
        <tr>
          <td style="padding:24px 28px; border-bottom:1px solid #f4f6f9;">&nbsp;</td>
          <td style="border-bottom:1px solid #f4f6f9;">&nbsp;</td>
        </tr>`)
      .join('');

    const credencialesHtml = data.credenciales ? `
      <div class="credenciales-box" style="margin-top: 30px; background: #eef2ff; border-left: 8px solid #3b82f6; padding: 20px 30px; border-radius: 12px;">
        <p style="font-size: 24px; font-weight: bold; color: #1e3a5f; margin-bottom: 12px;">🔐 Tus credenciales de acceso</p>
        <p style="font-size: 22px; margin: 8px 0;"><strong>Usuario:</strong> ${data.credenciales.username}</p>
        <p style="font-size: 22px; margin: 8px 0;"><strong>Contraseña:</strong> ${data.credenciales.password}</p>
        <p style="font-size: 18px; color: #4b5563; margin-top: 10px;">Guarda esta información para ingresar a tu portal.</p>
      </div>
    ` : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recibo #${String(data.pedido.id).padStart(4, '0')} — Vanguardistas 3.0</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #1e2d3d;
      font-size: 28px;
    }

    /* ══ HEADER ══ */
    .header {
      background: #0b3a5e;
      padding: 48px 60px 40px;
      border-bottom: 10px solid #f59e0b;
      width: 100%;
    }
    .header table { width: 100%; border-collapse: collapse; }
    .header td { vertical-align: middle; }

    .logo-wrap {
      display: inline-block;
      background: rgba(255,255,255,0.12);
      border-radius: 10px;
      padding: 10px;
      vertical-align: middle;
      margin-right: 25px;
    }
    .logo {
      width: 230px;
      height: 230px;
      object-fit: contain;
      border-radius: 5px;
      display: block;
    }
    .org-name {
      font-size: 36px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.25;
      display: inline-block;
      vertical-align: middle;
    }
    .org-sub {
      font-size: 22px;
      color: rgba(255,255,255,0.55);
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin-top: 8px;
    }
    .rlabel {
      font-size: 20px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.5);
      margin-bottom: 8px;
    }
    .rnum {
      font-size: 64px;
      font-weight: 700;
      color: #f59e0b;
      line-height: 1;
    }
    .rfecha {
      font-size: 22px;
      color: rgba(255,255,255,0.6);
      margin-top: 10px;
    }
    .estado-badge {
      display: inline-block;
      padding: 8px 26px;
      border-radius: 40px;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top: 14px;
      background: ${estadoPago.bg};
      color: ${estadoPago.color};
    }

    /* ══ SECCIÓN TÍTULOS ══ */
    .section-title {
      font-size: 18px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #8fa3b8;
      font-weight: 700;
      margin-bottom: 16px;
      margin-top: 40px;
    }

    /* ══ CLIENTE ══ */
    .cliente-box {
      background: #f6f9fc;
      border: 1px solid #e1eaf4;
      border-radius: 16px;
      padding: 28px 32px;
    }
    .cliente-box table { width: 100%; border-collapse: collapse; }
    .cliente-box td { vertical-align: middle; }

    .avatar {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: #0b3a5e;
      color: #ffffff;
      font-size: 34px;
      font-weight: 700;
      text-align: center;
      line-height: 90px;
      display: inline-block;
    }
    .cliente-nombre {
      font-size: 30px;
      font-weight: 700;
      color: #1e2d3d;
      margin-bottom: 8px;
    }
    .ci-badge {
      display: inline-block;
      background: #e8f0f8;
      color: #0b3a5e;
      font-size: 20px;
      font-weight: 700;
      padding: 3px 14px;
      border-radius: 8px;
      margin-left: 12px;
    }
    .cliente-meta {
      font-size: 24px;
      color: #6b849b;
      line-height: 1.6;
    }

    /* ══ TABLA ITEMS ══ */
    .items-table { width: 100%; border-collapse: collapse; font-size: 28px; }
    .items-table thead tr { background: #0b3a5e; }
    .items-table thead th {
      padding: 20px 28px;
      font-weight: 600;
      text-align: left;
      color: #ffffff;
      letter-spacing: 0.03em;
      font-size: 26px;
    }
    .items-table thead th.right { text-align: right; }

    /* ══ TOTALES ══ */
    .totales-box {
      background: #f6f9fc;
      border: 1px solid #e1eaf4;
      border-radius: 16px;
      padding: 30px 36px;
      margin-top: 40px;
    }
    .tot-table { width: 100%; border-collapse: collapse; }
    .tot-table td {
      padding: 16px 0;
      font-size: 28px;
      color: #4a6278;
      border-bottom: 1px dashed #dde5ef;
    }
    .tot-table tr:last-child td {
      border-bottom: none;
      border-top: 3px solid ${saldoBorder};
      padding-top: 22px;
      font-size: 36px;
      font-weight: 700;
      color: ${saldoColor};
    }
    .tot-table td.right { text-align: right; }

    /* ══ NOTA ══ */
    .nota {
      text-align: center;
      font-size: 22px;
      color: #8fa3b8;
      font-style: italic;
      margin-top: 40px;
    }
    .nota strong { font-style: normal; color: #0b3a5e; }

    .sello {
      display: block;
      border: 2px dashed #d1dde8;
      border-radius: 16px;
      padding: 16px 0;
      font-size: 20px;
      color: #a0b3c5;
      letter-spacing: 0.05em;
      text-align: center;
      margin: 22px auto 0;
      width: 70%;
    }

    /* ══ FOOTER ══ */
    .footer {
      background: #0b3a5e;
      padding: 30px 60px;
      border-top: 5px solid #f59e0b;
      margin-top: 50px;
      width: 100%;
    }
    .footer table { width: 100%; border-collapse: collapse; }
    .footer td { vertical-align: middle; }
    .fbrand {
      font-size: 26px;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      margin-bottom: 6px;
    }
    .footer p {
      font-size: 22px;
      color: rgba(255,255,255,0.5);
      line-height: 1.8;
    }
    .footer a { color: #f59e0b; text-decoration: none; }

    .divider { border: none; border-top: 1px solid #e8eef5; margin: 40px 0 0; }
    .spacer { height: 40px; }

    .credenciales-box {
      margin-top: 30px;
      background: #eef2ff;
      border-left: 8px solid #3b82f6;
      padding: 20px 30px;
      border-radius: 12px;
    }
    .credenciales-box p {
      font-size: 22px;
      margin: 8px 0;
    }
    .credenciales-box p:first-child {
      font-size: 24px;
      font-weight: bold;
      color: #1e3a5f;
      margin-bottom: 12px;
    }
    .credenciales-box p:last-child {
      font-size: 18px;
      color: #4b5563;
      margin-top: 10px;
    }
  </style>
</head>
<body>

  <!-- ══ HEADER ══ -->
  <div class="header">
    <table>
      <tr>
        <td style="width:80%;">
          <div class="logo-wrap">
            <img class="logo" src="${logoUrl}" alt="Logo" />
          </div>
          <div style="display:inline-block; vertical-align:middle;">
            <div class="org-name">Asociación de Escritores<br>Vanguardistas 3.0</div>
            <div class="org-sub">El Alto, Bolivia</div>
          </div>
        </td>
        <td style="width:40%; text-align:right; vertical-align:middle;">
          <div class="rlabel">Recibo de Pago</div>
          <div class="rnum">#${String(data.pedido.id).padStart(4, '0')}</div>
          <div class="rfecha">${fechaFormateada}</div>
          <div class="estado-badge">${estadoPago.label}</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- ══ BODY ══ -->
  <div style="padding: 10px 60px 0;">

    <!-- Cliente -->
    <div class="section-title">Datos del cliente</div>
    <div class="cliente-box">
      <table>
        <tr>
          <td style="width:110px;">
            <div class="avatar">${initials}</div>
          </td>
          <td>
            <div class="cliente-nombre">
              ${data.cliente.nombreCompleto}
              <span class="ci-badge">CI ${data.cliente.ci}</span>
            </div>
            <div class="cliente-meta">
              Celular: ${data.cliente.celular}&nbsp;&nbsp;|&nbsp;&nbsp;Email: ${data.cliente.email}
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Detalle -->
    <div class="section-title">Detalle del pedido</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>Producto / Servicio</th>
          <th class="right" style="width:260px;">Precio Unit.</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${emptyRows}
      </tbody>
    </table>

    <!-- Totales -->
    <div class="totales-box">
      <table class="tot-table">
        <tr>
          <td>Total del pedido</td>
          <td class="right" style="font-weight:600; color:#1e2d3d;">
            Bs ${data.pedido.montoTotal.toFixed(2)}
          </td>
        </tr>
        <tr>
          <td>Monto pagado</td>
          <td class="right" style="font-weight:700; color:#16a34a;">
            − Bs ${data.pedido.montoPagado.toFixed(2)}
          </td>
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
      ¡Gracias por confiar en <strong>Vanguardistas 3.0</strong>!
      Este documento es válido como comprobante de pago.
    </div>
    <div class="sello">Documento generado electrónicamente · No requiere firma física</div>

    <div class="spacer"></div>
  </div>

  <!-- ══ FOOTER ══ -->
  <div class="footer">
    <table>
      <tr>
        <td style="width:55%;">
          <div class="fbrand">Vanguardistas 3.0</div>
          <p>El Alto, Bolivia &nbsp;·&nbsp;
            <a href="mailto:xd@vanguardistas.com">xd@vanguardistas.com</a>
          </p>
          <p>Tel: +591 71234567</p>
        </td>
        <td style="text-align:right; vertical-align:middle;">
          <p>© 2026 Todos los derechos reservados</p>
          <p style="font-size:18px; color:rgba(255,255,255,0.28); margin-top:4px;">
            Recibo generado automáticamente
          </p>
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