import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import multer from "multer";
import cloudinary from "./cloudinary";
import bcrypt from "bcrypt";
import { enviarCorreo } from "./mailer";
import { enviarWhatsAppCliente } from "./whatsapp";
import { generarReciboPDF } from "./pdfGenerator";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "secret123";

const allowedOrigins = [
  "https://fullstack-project-blond.vercel.app",
  "https://fullstack-project-git-main-cristian-projects-6968.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS bloqueado: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.get("/ping", (req, res) => {
  res.json({ ok: true, message: "pong" });
});

app.use(express.json());
app.use(express.static("public"));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

declare global {
  namespace Express {
    interface Request {
      user?: any;
      clienteId?: number;
      username?: string;
    }
  }
}

const subirImagen = async (
  buffer: Buffer,
  carpeta: string,
  tipo: "image" | "raw" | "auto" = "image"
): Promise<string | null> => {
  try {
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: carpeta, resource_type: tipo }, (error, result) => {
          if (error || !result) return reject(error);
          resolve(result);
        })
        .end(buffer);
    });
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Cloudinary error (${carpeta}, tipo=${tipo}):`, error);
    return null;
  }
};

const auth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
};

const authCliente = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, SECRET) as any;
    if (decoded.role !== "cliente") {
      return res.status(403).json({ error: "Acceso solo para clientes" });
    }
    req.clienteId = decoded.clienteId;
    req.username = decoded.username;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

// ===================== LOGIN =====================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });
  if (user && user.password === password) {
    const token = jwt.sign({ id: user.id, username: user.username, role: "admin" }, SECRET, {
      expiresIn: "8h",
    });
    return res.json({ token, username: user.username, role: "admin" });
  }

  const client = await prisma.client.findFirst({ where: { clientUsername: username } });
  if (client && client.clientPassword) {
    const passwordValida = await bcrypt.compare(password, client.clientPassword);
    if (!passwordValida) return res.status(401).json({ error: "Credenciales incorrectas" });

    const token = jwt.sign(
      { id: client.id, clienteId: client.id, username: client.clientUsername, role: "cliente" },
      SECRET,
      { expiresIn: "8h" }
    );
    return res.json({
      token,
      username: client.clientUsername,
      role: "cliente",
      nombreCompleto: client.nombreCompleto,
    });
  }

  return res.status(401).json({ error: "Credenciales incorrectas" });
});

// ===================== NOTES =====================
app.get("/notes", auth, async (req, res) => {
  const userId = req.user!.id;
  res.json(await prisma.note.findMany({ where: { userId } }));
});
app.post("/notes", auth, async (req, res) => {
  const userId = req.user!.id;
  const { text } = req.body;
  res.json(await prisma.note.create({ data: { text, userId } }));
});
app.delete("/notes/:id", auth, async (req, res) => {
  await prisma.note.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== TASKS =====================
app.get("/tasks", auth, async (req, res) => {
  res.json(await prisma.task.findMany({ orderBy: { createdAt: "desc" } }));
});
app.post("/tasks", auth, async (req, res) => {
  res.json(await prisma.task.create({ data: { title: req.body.title } }));
});
app.put("/tasks/:id", auth, async (req, res) => {
  const { completed, title } = req.body;
  res.json(
    await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(completed !== undefined && { completed }),
        ...(title !== undefined && { title }),
      },
    })
  );
});
app.delete("/tasks/:id", auth, async (req, res) => {
  await prisma.task.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== CLIENTE TASKS =====================
app.get("/cliente-tasks", auth, async (req, res) => {
  res.json(
    await prisma.clienteTask.findMany({
      orderBy: { createdAt: "desc" },
      include: { cliente: true },
    })
  );
});
app.put("/cliente-tasks/:id", auth, async (req, res) => {
  res.json(
    await prisma.clienteTask.update({
      where: { id: Number(req.params.id) },
      data: { completada: req.body.completada },
      include: { cliente: true },
    })
  );
});
app.delete("/cliente-tasks/:id", auth, async (req, res) => {
  await prisma.clienteTask.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== PERSONS =====================
app.get("/persons", auth, async (req, res) => {
  res.json(await prisma.person.findMany());
});
app.post("/persons", auth, async (req, res) => {
  const { name, email } = req.body;
  res.json(await prisma.person.create({ data: { name, email } }));
});
app.delete("/persons/:id", auth, async (req, res) => {
  await prisma.person.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== MAGAZINES =====================
app.get("/magazines", async (req, res) => {
  res.json(
    await prisma.magazine.findMany({
      include: {
        director: true,
        articles: { include: { authors: true } },
        cliente: true,
        ediciones: { include: { items: { include: { pedido: { include: { cliente: true } } } } } },
      },
    })
  );
});
app.get("/magazines/:id", auth, async (req, res) => {
  res.json(
    await prisma.magazine.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        director: true,
        articles: { include: { authors: true } },
        cliente: true,
        ediciones: { include: { items: { include: { pedido: { include: { cliente: true } } } } } },
      },
    })
  );
});
app.post("/magazines", auth, async (req, res) => {
  const { title, directorId, notas, clienteId } = req.body;
  const magazine = await prisma.magazine.create({
    data: {
      title,
      directorId,
      notas: notas || null,
      clienteId: clienteId ? Number(clienteId) : null,
    },
    include: { director: true, cliente: true },
  });
  for (let i = 1; i <= 3; i++) {
    await prisma.edicion.create({ data: { numero: i, magazineId: magazine.id } });
  }
  res.json(magazine);
});
app.post("/magazines/:id/archivo", auth, upload.single("archivo"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Archivo requerido" });
    const url = await subirImagen(req.file.buffer, "revistas", "auto");
    const updated = await prisma.magazine.update({
      where: { id: Number(req.params.id) },
      data: { archivoUrl: url },
      include: { director: true, cliente: true, articles: { include: { authors: true } } },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al subir archivo" });
  }
});
app.put("/magazines/:id", auth, async (req, res) => {
  const { title, directorName, notas, clienteId } = req.body;
  let director = await prisma.person.findFirst({ where: { name: directorName } });
  if (!director) director = await prisma.person.create({ data: { name: directorName } });
  res.json(
    await prisma.magazine.update({
      where: { id: Number(req.params.id) },
      data: {
        title,
        directorId: director.id,
        notas: notas !== undefined ? notas : undefined,
        clienteId: clienteId !== undefined ? (clienteId ? Number(clienteId) : null) : undefined,
      },
      include: { director: true, cliente: true },
    })
  );
});
app.delete("/magazines/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.article.deleteMany({ where: { magazineId: id } });
  await prisma.magazine.delete({ where: { id } });
  res.json({ ok: true });
});

// ===================== ARTICLES =====================
app.get("/articles", auth, async (req, res) => {
  res.json(await prisma.article.findMany({ include: { authors: true, magazine: true } }));
});
app.post("/articles", auth, async (req, res) => {
  const { title, authorIds, magazineId, authorName } = req.body;
  let ids = authorIds || [];
  if (authorName && ids.length === 0) {
    let person = await prisma.person.findFirst({ where: { name: authorName } });
    if (!person) person = await prisma.person.create({ data: { name: authorName } });
    ids = [person.id];
  }
  res.json(
    await prisma.article.create({
      data: {
        title,
        magazineId: Number(magazineId),
        authors: { connect: ids.map((id: number) => ({ id })) },
      },
      include: { authors: true, magazine: true },
    })
  );
});
app.put("/articles/:id", auth, async (req, res) => {
  const { title, authorName } = req.body;
  let person = await prisma.person.findFirst({ where: { name: authorName } });
  if (!person) person = await prisma.person.create({ data: { name: authorName } });
  res.json(
    await prisma.article.update({
      where: { id: Number(req.params.id) },
      data: { title, authors: { set: [{ id: person.id }] } },
      include: { authors: true, magazine: true },
    })
  );
});
app.delete("/articles/:id", auth, async (req, res) => {
  await prisma.article.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== BOOKS =====================
app.get("/books", async (req, res) => {
  res.json(await prisma.book.findMany({ include: { author: true, cliente: true } }));
});
app.post("/books", auth, async (req, res) => {
  const { title, authorName, notas, clienteId } = req.body;
  let author = await prisma.person.findFirst({ where: { name: authorName } });
  if (!author) author = await prisma.person.create({ data: { name: authorName } });
  res.json(
    await prisma.book.create({
      data: {
        title,
        authorId: author.id,
        notas: notas || null,
        clienteId: clienteId ? Number(clienteId) : null,
      },
      include: { author: true, cliente: true },
    })
  );
});
app.post("/books/:id/archivo", auth, upload.single("archivo"), async (req: any, res) => {
  const url = await subirImagen(req.file.buffer, "libros", "auto");
  res.json(
    await prisma.book.update({
      where: { id: Number(req.params.id) },
      data: { archivoUrl: url },
      include: { author: true, cliente: true },
    })
  );
});
app.put("/books/:id", auth, async (req, res) => {
  const { title, authorName, notas, clienteId } = req.body;
  let author = await prisma.person.findFirst({ where: { name: authorName } });
  if (!author) author = await prisma.person.create({ data: { name: authorName } });
  res.json(
    await prisma.book.update({
      where: { id: Number(req.params.id) },
      data: {
        title,
        authorId: author.id,
        notas: notas !== undefined ? notas : undefined,
        clienteId: clienteId !== undefined ? (clienteId ? Number(clienteId) : null) : undefined,
      },
      include: { author: true, cliente: true },
    })
  );
});
app.delete("/books/:id", auth, async (req, res) => {
  await prisma.book.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== PROJECTS =====================
app.get("/projects", async (req, res) => {
  res.json(await prisma.project.findMany());
});
app.post("/projects", auth, async (req, res) => {
  const { title, description, imageUrl } = req.body;
  res.json(await prisma.project.create({ data: { title, description, imageUrl } }));
});
app.delete("/projects/:id", auth, async (req, res) => {
  await prisma.project.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== PRODUCTOS =====================
app.get("/productos", async (req, res) => {
  res.json(await prisma.producto.findMany({ where: { activo: true } }));
});
app.get("/productos/admin", auth, async (req, res) => {
  res.json(await prisma.producto.findMany({ orderBy: { creadoEn: "desc" } }));
});
app.post("/productos", auth, upload.single("imagen"), async (req, res) => {
  const { nombre, descripcion, precio, descuento } = req.body;
  let imagenUrl: string | undefined = undefined;
  if (req.file) {
    try {
      imagenUrl = (await subirImagen(req.file.buffer, "productos", "image")) ?? undefined;
    } catch (err) {
      console.error("❌ Error subiendo imagen:", err);
    }
  }
  const producto = await prisma.producto.create({
    data: { nombre, descripcion, precio: Number(precio), descuento: Number(descuento), imagenUrl },
  });
  res.json(producto);
});
app.put("/productos/:id", auth, upload.single("imagen"), async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, descripcion, precio, descuento, activo } = req.body;
  let imagenUrl: string | null = null;
  if (req.file) {
    imagenUrl = await subirImagen(req.file.buffer, "productos", "image");
  }
  const data: any = {};
  if (nombre !== undefined) data.nombre = nombre;
  if (descripcion !== undefined) data.descripcion = descripcion;
  if (precio !== undefined) data.precio = Number(precio);
  if (descuento !== undefined) data.descuento = Number(descuento);
  if (activo !== undefined) data.activo = activo === "true" || activo === true;
  if (imagenUrl) data.imagenUrl = imagenUrl;
  res.json(await prisma.producto.update({ where: { id }, data }));
});
app.delete("/productos/:id", auth, async (req, res) => {
  await prisma.producto.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== PAGOS =====================
app.post("/pagos", upload.single("comprobante"), async (req: any, res) => {
  try {
    const { nombreDeclarado, monto, tipo, descripcion, productos, celular, ci } = req.body;
    if (!nombreDeclarado || !monto) {
      return res.status(400).json({ error: "Faltan datos obligatorios: nombreDeclarado y monto" });
    }
    let imagenUrl: string | null = null;
    if (req.file) {
      imagenUrl = await subirImagen(req.file.buffer, "pagos/comprobantes", "image");
    }
    const pago = await prisma.pago.create({
      data: {
        nombreDeclarado,
        monto: Number(monto),
        tipo: tipo || (imagenUrl ? "imagen" : "declarado"),
        descripcion: descripcion || undefined,
        imagenUrl: imagenUrl ?? undefined,
        productos: productos || null,
        celular: celular || null,
        ci: ci || null,
      },
    });
    try {
      const { notificarAdminMensaje } = await import("./whatsapp");
      await notificarAdminMensaje(`Nuevo pago pendiente de ${nombreDeclarado} por Bs ${monto}`);
    } catch (err) {
      console.warn("⚠️ No se pudo notificar al admin:", err);
    }
    res.json(pago);
  } catch (error: any) {
    console.error("💥 Error en POST /pagos:", error?.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/pagos/manual", auth, async (req, res) => {
  const { nombreDeclarado, monto, pedidoId, celular, ci } = req.body;
  const pago = await prisma.pago.create({
    data: {
      nombreDeclarado,
      monto: Number(monto),
      tipo: "manual",
      estado: "verificado",
      celular: celular || null,
      ci: ci || null,
    },
  });
  if (pedidoId) {
    const pedido = await prisma.pedido.findUnique({ where: { id: Number(pedidoId) } });
    if (pedido) {
      await prisma.pedido.update({
        where: { id: Number(pedidoId) },
        data: { montoPagado: pedido.montoPagado + Number(monto) },
      });
    }
  }
  res.json(pago);
});

app.get("/pagos", auth, async (req, res) => {
  const pagos = await prisma.pago.findMany({
    orderBy: { creadoEn: "desc" },
    include: {
      cliente: {
        include: {
          pedidos: {
            where: { estado: { not: "completado" } },
            orderBy: { creadoEn: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  const pagosConPedido = pagos.map((p) => ({
    ...p,
    pedido: p.cliente?.pedidos?.[0] || null,
  }));
  res.json(pagosConPedido);
});

app.put("/pagos/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { nombreDeclarado, monto } = req.body;
  const data: any = {};
  if (nombreDeclarado !== undefined) data.nombreDeclarado = nombreDeclarado;
  if (monto !== undefined) data.monto = Number(monto);
  res.json(await prisma.pago.update({ where: { id }, data }));
});
app.delete("/pagos/:id", auth, async (req, res) => {
  await prisma.pago.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== VERIFICAR PAGO (CORREGIDO) =====================
app.put("/pagos/:id/verificar", auth, async (req, res) => {
  const id = Number(req.params.id);
  const pago = await prisma.pago.findUnique({ where: { id } });
  if (!pago) return res.status(404).json({ error: "Pago no encontrado" });

  await prisma.pago.update({ where: { id }, data: { estado: "verificado" } });

  let cliente = null;
  if (pago.ci) {
    cliente = await prisma.client.findFirst({ where: { ci: pago.ci } });
  }
  if (!cliente && pago.celular) {
    cliente = await prisma.client.findFirst({ where: { celular: pago.celular } });
  }

  let esClienteNuevo = false;
  let username: string | undefined;
  let password: string | undefined;
  let tokenFormulario: string | undefined;

  if (!cliente) {
    esClienteNuevo = true;
    tokenFormulario = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 4);
    cliente = await prisma.client.create({
      data: {
        token: tokenFormulario,
        expiresAt,
        nombreCompleto: pago.nombreDeclarado,
        ci: pago.ci || null,
        celular: pago.celular || null,
      },
    });
    await prisma.pago.update({ where: { id }, data: { clienteId: cliente.id } });

    username = pago.ci ? String(pago.ci) : tokenFormulario.substring(0, 8);
    let counter = 1;
    while (await prisma.client.findFirst({ where: { clientUsername: username } })) {
      username = `${pago.ci || tokenFormulario.substring(0, 8)}${counter}`;
      counter++;
    }
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    password = "";
    for (let i = 0; i < 8; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.client.update({
      where: { id: cliente.id },
      data: { clientUsername: username, clientPassword: hashedPassword, credencialesGeneradaAt: new Date() },
    });
  } else {
    await prisma.client.update({
      where: { id: cliente.id },
      data: {
        celular: pago.celular || cliente.celular,
        nombreCompleto: pago.nombreDeclarado || cliente.nombreCompleto,
      },
    });
    await prisma.pago.update({ where: { id }, data: { clienteId: cliente.id } });
  }

  // ***** LÓGICA ROBUSTA *****
  let montoTotal = 0;
  const itemsParaPedido: any[] = [];

  if (pago.productos) {
    try {
      const carrito = JSON.parse(pago.productos);
      console.log("📦 Carrito recibido en verificación:", JSON.stringify(carrito, null, 2));

      if (Array.isArray(carrito) && carrito.length > 0) {
        // Obtener productos de BD por si faltan precios
        const ids = carrito.map((item: any) => item.id).filter((id: any) => id != null);
        let productosBD: any[] = [];
        let productoPorId = new Map();
        if (ids.length > 0) {
          productosBD = await prisma.producto.findMany({ where: { id: { in: ids } } });
          productoPorId = new Map(productosBD.map(p => [p.id, p]));
        }

        for (const item of carrito) {
          let precioFinal: number | null = null;
          let nombreProducto = item.nombre || "Producto desconocido";

          // Priorizar precio enviado por frontend
          if (typeof item.precioUnitario === 'number' && !isNaN(item.precioUnitario) && item.precioUnitario > 0) {
            precioFinal = item.precioUnitario;
            console.log(`✅ Usando precio del frontend para ${nombreProducto}: ${precioFinal}`);
          }
          // Fallback a BD por ID
          else if (item.id && productoPorId.has(item.id)) {
            const producto = productoPorId.get(item.id);
            nombreProducto = producto.nombre;
            precioFinal = producto.descuento > 0
              ? producto.precio - (producto.precio * producto.descuento / 100)
              : producto.precio;
            console.log(`⚠️ Precio no enviado, usando BD para ${nombreProducto}: ${precioFinal}`);
          }

          if (precioFinal !== null && precioFinal > 0) {
            montoTotal += precioFinal;
            itemsParaPedido.push({
              tipo: "producto",
              titulo: nombreProducto,
              notas: `Precio unitario: Bs ${precioFinal.toFixed(2)}`,
              precioUnitario: precioFinal,
            });
          } else {
            console.error(`❌ No se pudo determinar precio para item:`, item);
          }
        }
      }
    } catch (err) {
      console.error("Error parseando productos del pago:", err);
    }
  }

  if (montoTotal === 0 && itemsParaPedido.length === 0) {
    montoTotal = pago.monto;
    itemsParaPedido.push({
      tipo: "desconocido",
      titulo: "Pago sin productos específicos",
      precioUnitario: pago.monto,
      notas: "",
    });
    console.log("⚠️ No se encontraron productos, usando fallback genérico");
  }

  console.log("💰 Monto total calculado:", montoTotal);
  console.log("📋 Items para pedido:", itemsParaPedido);

  const nuevoPedido = await prisma.pedido.create({
    data: {
      clienteId: cliente.id,
      montoTotal,
      montoPagado: pago.monto,
      items: {
        create: itemsParaPedido.map(item => ({
          tipo: item.tipo,
          titulo: item.titulo,
          notas: item.notas,
          precioUnitario: item.precioUnitario,
        })),
      },
    },
  });

  const itemsParaPDF = itemsParaPedido.map(item => ({
    titulo: item.titulo,
    tipo: item.tipo,
    precioUnitario: item.precioUnitario,
  }));

  const reciboData = {
    cliente: {
      nombreCompleto: cliente.nombreCompleto || pago.nombreDeclarado,
      ci: cliente.ci || "",
      celular: cliente.celular || "",
      email: cliente.email || "",
    },
    pedido: {
      id: nuevoPedido.id,
      montoTotal,
      montoPagado: pago.monto,
      saldoPendiente: montoTotal - pago.monto,
      fecha: new Date(),
    },
    items: itemsParaPDF,
    credenciales: esClienteNuevo && username && password ? { username: username!, password } : undefined,
  };

  let pdfBuffer: Buffer | undefined;
  try {
    pdfBuffer = await generarReciboPDF(reciboData);
  } catch (err) {
    console.error("Error generando PDF:", err);
  }

  try {
    const { notificarAdminMensaje } = await import("./whatsapp");
    const linkFormulario = `${process.env.CLIENT_PORTAL_URL || ""}/formulario/${cliente.token}`;
    await notificarAdminMensaje(
      `✅ Nuevo pedido de ${cliente.nombreCompleto || pago.nombreDeclarado}. Total: Bs ${montoTotal}, Pagado: Bs ${pago.monto}. Link: ${linkFormulario}`
    );
  } catch (err) {
    console.warn("No se pudo notificar al admin:", err);
  }

  const LINK_PORTAL = process.env.CLIENT_PORTAL_URL || "";
  if (esClienteNuevo && username && password) {
    setTimeout(async () => {
      await enviarWhatsAppCliente(
        cliente.celular || "",
        cliente.nombreCompleto || pago.nombreDeclarado,
        username!,
        password!,
        LINK_PORTAL,
        pdfBuffer,
        `Recibo_Pedido_${nuevoPedido.id}.pdf`
      );
    }, 5000);
  } else if (pdfBuffer) {
    setTimeout(async () => {
      await enviarWhatsAppCliente(
        cliente.celular || "",
        cliente.nombreCompleto || pago.nombreDeclarado,
        "",
        "",
        "",
        pdfBuffer,
        `Recibo_Pedido_${nuevoPedido.id}.pdf`
      );
    }, 5000);
  }

  res.json({ ...pago, clienteId: cliente.id, pedido: nuevoPedido });
});

app.put("/pagos/:id/rechazar", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { motivoRechazo } = req.body;
  res.json(
    await prisma.pago.update({ where: { id }, data: { estado: "rechazado", motivoRechazo } })
  );
});

// ===================== CLIENTES =====================
app.get("/clients", auth, async (req, res) => {
  res.json(await prisma.client.findMany({ orderBy: { createdAt: "desc" } }));
});

app.get("/clients/form/:token", async (req, res) => {
  const client = await prisma.client.findUnique({ where: { token: req.params.token } });
  if (!client) return res.status(404).json({ error: "Link no válido" });
  if (new Date() > client.expiresAt) return res.status(410).json({ error: "Este link ha expirado" });
  res.json(client);
});

app.post("/clients", auth, async (req, res) => {
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 4);
  res.json(
    await prisma.client.create({
      data: { token, expiresAt, nombreCompleto: req.body.nombreCompleto || null },
    })
  );
});

app.post(
  "/clients/form/:token/fotos",
  upload.fields([
    { name: "fotografia", maxCount: 1 },
    { name: "fotoCarnet", maxCount: 1 },
    { name: "fotoCarnet2", maxCount: 1 },
  ]),
  async (req: any, res) => {
    try {
      const client = await prisma.client.findUnique({ where: { token: req.params.token } });
      if (!client) return res.status(404).json({ error: "Link no válido" });
      if (new Date() > client.expiresAt) return res.status(410).json({ error: "Link expirado" });

      const files = req.files as Record<string, Express.Multer.File[]>;
      const data: any = {};

      if (files?.fotografia?.[0]) {
        data.fotografia = await subirImagen(files.fotografia[0].buffer, "clientes/fotografias", "image");
        if (!data.fotografia) throw new Error("Error al subir fotografía personal");
      }

      if (files?.fotoCarnet?.[0]) {
        const file = files.fotoCarnet[0];
        const esImagen = file.mimetype.startsWith("image/");
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

        if (esImagen) {
          data.fotoCarnet = await subirImagen(file.buffer, "clientes/carnets", "image");
        } else {
          const safeOriginalName = file.originalname
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9._-]/g, "");
          const publicId = `${uniqueSuffix}-${safeOriginalName}`;

          const result = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "clientes/carnets",
                resource_type: "raw",
                public_id: publicId,
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(file.buffer);
          });
          data.fotoCarnet = result.secure_url;
        }
        if (!data.fotoCarnet) throw new Error("Error al subir carnet (frente)");
      }

      if (files?.fotoCarnet2?.[0]) {
        data.fotoCarnet2 = await subirImagen(files.fotoCarnet2[0].buffer, "clientes/carnets", "image");
        if (!data.fotoCarnet2) throw new Error("Error al subir carnet (reverso)");
      }

      const updated = await prisma.client.update({
        where: { token: req.params.token },
        data,
      });
      res.json(updated);
    } catch (error) {
      console.error("❌ Error en /clients/form/:token/fotos:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Error al subir las imágenes" });
    }
  }
);

app.put("/clients/form/:token", async (req, res) => {
  const client = await prisma.client.findUnique({ where: { token: req.params.token } });
  if (!client) return res.status(404).json({ error: "Link no válido" });
  if (new Date() > client.expiresAt) return res.status(410).json({ error: "Este link ha expirado" });

  const {
    ci, nombres, apellidoPaterno, apellidoMaterno, sexo, ciudad, nombreCompleto,
    direccion, fechaNacimiento, extension, profesion, celular, email,
    pideLibros, cantLibros, pideArticulos, cantArticulos, pideDirector, pideFundador, notasServicio,
  } = req.body;

  const updated = await prisma.client.update({
    where: { token: req.params.token },
    data: {
      ci, nombres, apellidoPaterno, apellidoMaterno, sexo, ciudad, nombreCompleto,
      direccion, fechaNacimiento, extension, profesion, celular, email,
      pideLibros,
      cantLibros: pideLibros ? cantLibros : 0,
      pideArticulos,
      cantArticulos: pideArticulos ? cantArticulos : 0,
      pideDirector, pideFundador, notasServicio,
      status: "formulario llenado",
    },
  });

  const nombresArray = (updated.nombres || "").split(" ");
  const apellidoPaternoRaw = (updated.apellidoPaterno || "").toLowerCase();
  let baseUsername = `${nombresArray[0] || ""}.${apellidoPaternoRaw}`
    .replace(/\s+/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let username = baseUsername;
  let counter = 1;
  while (
    await prisma.client.findFirst({
      where: { clientUsername: username, NOT: { id: updated.id } },
    })
  ) {
    username = `${baseUsername}${counter}`;
    counter++;
  }

  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.client.update({
    where: { id: updated.id },
    data: { clientUsername: username, clientPassword: hashedPassword, credencialesGeneradaAt: new Date() },
  });

  let pdfBase64: string | null = null;
  const pedidoActivo = await prisma.pedido.findFirst({
    where: { clienteId: updated.id, estado: { not: "completado" } },
    orderBy: { creadoEn: "desc" },
    include: { items: true },
  });

  if (pedidoActivo) {
    const itemsParaPDF = pedidoActivo.items.map((item) => ({
      titulo: item.titulo || "Producto",
      tipo: item.tipo,
      precioUnitario: item.precioUnitario ?? (pedidoActivo.montoTotal / (pedidoActivo.items.length || 1)),
    }));
    const reciboData = {
      cliente: {
        nombreCompleto:
          updated.nombreCompleto ||
          [updated.nombres, updated.apellidoPaterno, updated.apellidoMaterno].filter(Boolean).join(" ") ||
          "Cliente",
        ci: updated.ci || "",
        celular: updated.celular || "",
        email: updated.email || "",
      },
      pedido: {
        id: pedidoActivo.id,
        montoTotal: pedidoActivo.montoTotal,
        montoPagado: pedidoActivo.montoPagado,
        saldoPendiente: pedidoActivo.montoTotal - pedidoActivo.montoPagado,
        fecha: pedidoActivo.creadoEn,
      },
      items: itemsParaPDF,
      credenciales: { username, password },
    };
    try {
      const pdfBuffer = await generarReciboPDF(reciboData);
      pdfBase64 = pdfBuffer.toString("base64");
    } catch (err) {
      console.error("Error generando PDF en formulario:", err);
    }
  }

  res.json({ client: updated, credentials: { username, password }, pdfBase64 });

  await prisma.clienteTask.deleteMany({ where: { clienteId: updated.id } });
  await prisma.entrega.deleteMany({ where: { clienteId: updated.id } });

  const tareas: any[] = [];
  if (pideDirector) {
    for (let i = 1; i <= 3; i++) {
      tareas.push({
        tipo: "edicion_revista",
        descripcion: `Edición ${i} de revista — ${nombreCompleto} (1 artículo)`,
        clienteId: updated.id,
      });
    }
    const articulosRestantes = (cantArticulos || 0) - 3;
    if (pideArticulos && articulosRestantes > 0) {
      for (let i = 1; i <= articulosRestantes; i++) {
        tareas.push({
          tipo: "articulo",
          descripcion: `Artículo extra ${i} — ${nombreCompleto} (otra revista)`,
          clienteId: updated.id,
        });
      }
    }
  } else if (pideArticulos && cantArticulos > 0) {
    for (let i = 1; i <= cantArticulos; i++) {
      tareas.push({ tipo: "articulo", descripcion: `Artículo ${i} — ${nombreCompleto}`, clienteId: updated.id });
    }
  }

  if (pideLibros && cantLibros > 0) {
    for (let i = 1; i <= cantLibros; i++) {
      tareas.push({ tipo: "libro", descripcion: `Libro ${i} — ${nombreCompleto}`, clienteId: updated.id });
    }
  }

  if (tareas.length > 0) await prisma.clienteTask.createMany({ data: tareas });
  await prisma.entrega.create({ data: { estado: "pendiente", clienteId: updated.id } });
});

// ===================== (El resto de las rutas – mantén las que ya tenías) =====================
// Incluye todas las rutas de pedidos, items, entregas, etc.
// ... (por brevedad, no las repito aquí, pero deben estar presentes) ...

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
  console.log(`🌐 Acceso local: http://localhost:${PORT}`);
  console.log(`🚀 CORS permitido para: ${allowedOrigins.join(", ")}`);
});