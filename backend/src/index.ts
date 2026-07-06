import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import multer from "multer";
import cloudinary from "./cloudinary";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { enviarCorreo } from "./mailer";
import { enviarWhatsAppCliente } from "./whatsapp";
import { generarReciboPDF } from "./pdfGenerator";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "secret123";
app.set("trust proxy", 1);

function parseDispositivo(ua: string): string {
  let os = "Dispositivo desconocido";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ios/i.test(ua)) os = "iOS";
  else if (/mac os/i.test(ua)) os = "Mac";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Navegador desconocido";
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome/i.test(ua)) browser = "Chrome";
  else if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";

  return `${browser} en ${os}`;
}
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 6, // máximo 6 intentos por IP en esa ventana
  message: { error: "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
const publicFormLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 10, // máximo 10 peticiones por IP en esa ventana
  message: { error: "Demasiadas solicitudes. Por favor, intenta de nuevo en unos minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
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

const auth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, SECRET) as any;
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Acceso solo para administradores" });
    }
    if (decoded.sessionId) {
      const sesion = await prisma.sesionAdmin.findUnique({ where: { id: decoded.sessionId } });
      if (!sesion || !sesion.activa) {
        return res.status(401).json({ error: "Tu sesión fue cerrada. Inicia sesión nuevamente." });
      }
      prisma.sesionAdmin
        .update({ where: { id: decoded.sessionId }, data: { ultimaActividad: new Date() } })
        .catch(() => {});
    }
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
app.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });
  if (user) {
    const passwordValidaAdmin = user.password.startsWith("$2")
      ? await bcrypt.compare(password, user.password)
      : user.password === password;
    if (passwordValidaAdmin) {
      const userAgent = req.headers["user-agent"] || "";
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;

      const sesion = await prisma.sesionAdmin.create({
        data: {
          userId: user.id,
          dispositivo: parseDispositivo(userAgent),
          ip,
        },
      });

      const token = jwt.sign(
        { id: user.id, username: user.username, role: "admin", sessionId: sesion.id },
        SECRET,
        { expiresIn: "8h" }
      );
      return res.json({
        token,
        username: user.username,
        role: "admin",
        debeCambiarPassword: user.debeCambiarPassword,
      });
    }
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
      debeCambiarPassword: client.debeCambiarPassword,
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
        articles: {
          include: {
            authors: true,
            cliente: true,
            edicion: true,
          },
        },
        cliente: true,
        ediciones: {
          include: {
            items: {
              include: {
                pedido: { include: { cliente: true } },
              },
            },
            articles: {
              include: {
                authors: true,
                cliente: true,
              },
            },
          },
        },
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

  try {
    await prisma.article.deleteMany({ where: { magazineId: id } });

    const ediciones = await prisma.edicion.findMany({
      where: { magazineId: id },
      select: { id: true },
    });
    const edicionIds = ediciones.map(e => e.id);
    if (edicionIds.length > 0) {
      await prisma.itemPedido.updateMany({
        where: { edicionId: { in: edicionIds } },
        data: { edicionId: null },
      });
    }

    await prisma.edicion.deleteMany({ where: { magazineId: id } });
    await prisma.entrega.deleteMany({ where: { magazineId: id } });
    await prisma.magazine.delete({ where: { id } });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar revista:", error);
    res.status(500).json({ error: "Error interno al eliminar la revista" });
  }
});

// ===================== ARTICLES =====================
app.get("/articles", auth, async (req, res) => {
  res.json(await prisma.article.findMany({ include: { authors: true, magazine: true } }));
});

app.post("/articles", auth, async (req, res) => {
  const { title, authorIds, magazineId, authorName, clienteId, edicionId } = req.body;
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
        clienteId: clienteId ? Number(clienteId) : null,
        edicionId: edicionId ? Number(edicionId) : null,
      },
      include: { authors: true, magazine: true, cliente: true, edicion: true },
    })
  );
});

app.put("/articles/:id", auth, async (req, res) => {
  const { title, authorName, clienteId, edicionId } = req.body;
  let person = await prisma.person.findFirst({ where: { name: authorName } });
  if (!person) person = await prisma.person.create({ data: { name: authorName } });
  res.json(
    await prisma.article.update({
      where: { id: Number(req.params.id) },
      data: {
        title,
        authors: { set: [{ id: person.id }] },
        clienteId: clienteId !== undefined ? (clienteId ? Number(clienteId) : null) : undefined,
        edicionId: edicionId !== undefined ? (edicionId ? Number(edicionId) : null) : undefined,
      },
      include: { authors: true, magazine: true, cliente: true, edicion: true },
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
  const { nombre, descripcion, precio, descuento, componentes } = req.body;
  let imagenUrl: string | undefined = undefined;
  if (req.file) {
    try {
      imagenUrl = (await subirImagen(req.file.buffer, "productos", "image")) ?? undefined;
    } catch (err) {
      console.error("❌ Error subiendo imagen:", err);
    }
  }
  let componentesData = null;
  try {
    if (componentes) componentesData = JSON.parse(componentes);
  } catch { /* ignorar */ }
  const producto = await prisma.producto.create({
    data: {
      nombre,
      descripcion: descripcion || "",
      precio: Number(precio),
      descuento: Number(descuento || 0),
      imagenUrl,
      componentes: componentesData,
    },
  });
  res.json(producto);
});

app.put("/productos/:id", auth, upload.single("imagen"), async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, descripcion, precio, descuento, activo, componentes } = req.body;
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
  if (componentes !== undefined) {
    try {
      data.componentes = JSON.parse(componentes);
    } catch { data.componentes = null; }
  }
  res.json(await prisma.producto.update({ where: { id }, data }));
});

app.delete("/productos/:id", auth, async (req, res) => {
  await prisma.producto.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== PAGOS =====================
app.post("/pagos", publicFormLimiter, upload.single("comprobante"), async (req: any, res) => {
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
      await prisma.pago.update({
        where: { id: pago.id },
        data: { pedidoId: pedido.id },
      });
    }
  }
  res.json(pago);
});

app.get("/pagos", auth, async (req, res) => {
  const pagos = await prisma.pago.findMany({
    orderBy: { creadoEn: "desc" },
    include: { cliente: true, pedido: true },
  });
  res.json(pagos);
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

// ===================== VERIFICAR PAGO =====================
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

  let montoTotal = 0;
  const itemsParaPedido: any[] = [];

  if (pago.productos) {
    try {
      const carrito = JSON.parse(pago.productos);
      if (Array.isArray(carrito) && carrito.length > 0) {
        const idsReales = carrito
          .map((item: any) => item.id)
          .filter((id: any) => id != null && typeof id === 'number' && !String(id).includes('_comp_'));

        let productosBD: any[] = [];
        let productoPorId = new Map();
        if (idsReales.length > 0) {
          productosBD = await prisma.producto.findMany({ where: { id: { in: idsReales } } });
          productoPorId = new Map(productosBD.map(p => [p.id, p]));
        }

        for (const item of carrito) {
          let precioFinal: number | null = null;
          let nombreProducto = item.nombre || "Producto desconocido";

          if (typeof item.precioUnitario === 'number' && !isNaN(item.precioUnitario) && item.precioUnitario > 0) {
            precioFinal = item.precioUnitario;
          }
          else if (item.id && typeof item.id === 'number' && !String(item.id).includes('_comp_') && productoPorId.has(item.id)) {
            const producto = productoPorId.get(item.id);
            nombreProducto = producto.nombre;
            precioFinal = producto.descuento > 0
              ? producto.precio - (producto.precio * producto.descuento / 100)
              : producto.precio;
          }

          if (precioFinal !== null && precioFinal > 0) {
  montoTotal += precioFinal;
  itemsParaPedido.push({
    tipo: item.tipo || "producto",
    titulo: nombreProducto,
    notas: `Precio unitario: Bs ${precioFinal.toFixed(2)}`,
    precioUnitario: precioFinal,
    conIsbn: item.conIsbn || false,
    conSenapi: item.conSenapi || false,
  });
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
  }

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
    conIsbn: item.conIsbn || false,
    conSenapi: item.conSenapi || false,
  })),
},
    },
  });
  await prisma.pago.update({ where: { id: pago.id }, data: { pedidoId: nuevoPedido.id } });

  const itemsParaPDF = itemsParaPedido.map(item => ({ titulo: item.titulo, tipo: item.tipo, precioUnitario: item.precioUnitario }));
  const reciboData = {
    cliente: { nombreCompleto: cliente.nombreCompleto || pago.nombreDeclarado, ci: cliente.ci || "", celular: cliente.celular || "", email: cliente.email || "" },
    pedido: { id: nuevoPedido.id, montoTotal, montoPagado: pago.monto, saldoPendiente: montoTotal - pago.monto, fecha: new Date() },
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
    await notificarAdminMensaje(`✅ Nuevo pedido de ${cliente.nombreCompleto || pago.nombreDeclarado}. Total: Bs ${montoTotal}, Pagado: Bs ${pago.monto}. Link: ${linkFormulario}`);
  } catch (err) {
    console.warn("No se pudo notificar al admin:", err);
  }

  const LINK_PORTAL = process.env.CLIENT_PORTAL_URL || "";
  if (esClienteNuevo && username && password) {
    setTimeout(async () => {
      await enviarWhatsAppCliente(cliente.celular || "", cliente.nombreCompleto || pago.nombreDeclarado, username!, password!, LINK_PORTAL, pdfBuffer, `Recibo_Pedido_${nuevoPedido.id}.pdf`);
    }, 5000);
  } else if (pdfBuffer) {
    setTimeout(async () => {
      await enviarWhatsAppCliente(cliente.celular || "", cliente.nombreCompleto || pago.nombreDeclarado, "", "", "", pdfBuffer, `Recibo_Pedido_${nuevoPedido.id}.pdf`);
    }, 5000);
  }
  res.json({
    ...pago,
    clienteId: cliente.id,
    pedido: nuevoPedido,
    clienteToken: cliente.token,
    clienteCelular: cliente.celular,
    esClienteNuevo,
  });
});

app.put("/pagos/:id/rechazar", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { motivoRechazo } = req.body;
  res.json(await prisma.pago.update({ where: { id }, data: { estado: "rechazado", motivoRechazo } }));
});

// ===================== CLIENTES =====================
app.get("/clients", auth, async (req, res) => {
  res.json(await prisma.client.findMany({ orderBy: { createdAt: "desc" } }));
});

app.get("/clients/form/:token", async (req, res) => {
  const client = await prisma.client.findUnique({ where: { token: req.params.token } });
  if (!client) return res.status(404).json({ error: "Link no válido" });
  if (new Date() > client.expiresAt) return res.status(410).json({ error: "Este link ha expirado" });
  if (client.clientUsername && client.status === "formulario llenado") {
    return res.status(410).json({ error: "Este link ya fue utilizado y no puede volver a enviarse." });
  }
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
  publicFormLimiter,
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
          const safeOriginalName = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
          const publicId = `${uniqueSuffix}-${safeOriginalName}`;
          const result = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: "clientes/carnets", resource_type: "raw", public_id: publicId },
              (error, result) => { if (error) reject(error); else resolve(result); }
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
      const updated = await prisma.client.update({ where: { token: req.params.token }, data });
      res.json(updated);
    } catch (error) {
      console.error("❌ Error en /clients/form/:token/fotos:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Error al subir las imágenes" });
    }
  }
);

app.put("/clients/form/:token", publicFormLimiter, async (req, res) => {
  const client = await prisma.client.findUnique({ where: { token: req.params.token as string } });
  if (!client) return res.status(404).json({ error: "Link no válido" });
  if (new Date() > client.expiresAt) return res.status(410).json({ error: "Este link ha expirado" });
  if (client.clientUsername && client.status === "formulario llenado") {
    return res.status(410).json({ error: "Este link ya fue utilizado y no puede volver a enviarse." });
  }
  const {
    ci, nombres, apellidoPaterno, apellidoMaterno, sexo, ciudad, nombreCompleto,
    direccion, fechaNacimiento, extension, profesion, celular, email,
    pideLibros, cantLibros, pideArticulos, cantArticulos, pideDirector, pideFundador, notasServicio,
  } = req.body;
  const updated = await prisma.client.update({
    where: { token: req.params.token as string },
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
  let baseUsername = (updated.ci || "").trim();
  if (!baseUsername) {
    const nombresArray = (updated.nombres || "").split(" ");
    baseUsername = `${nombresArray[0] || "cliente"}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  let username = baseUsername;
  let counter = 1;
  while (await prisma.client.findFirst({ where: { clientUsername: username, NOT: { id: updated.id } } })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.client.update({
    where: { id: updated.id },
    data: { clientUsername: username, clientPassword: hashedPassword, credencialesGeneradaAt: new Date(), debeCambiarPassword: true },
  });
  const credentials = { username, password };
  await prisma.client.update({ where: { id: updated.id }, data: { expiresAt: new Date(0) } });
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
        nombreCompleto: updated.nombreCompleto || [updated.nombres, updated.apellidoPaterno, updated.apellidoMaterno].filter(Boolean).join(" ") || "Cliente",
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
      credenciales: credentials,
    };
    try {
      const pdfBuffer = await generarReciboPDF(reciboData);
      pdfBase64 = pdfBuffer.toString("base64");
    } catch (err) {
      console.error("Error generando PDF en formulario:", err);
    }
  }
  res.json({ client: updated, credentials, pdfBase64 });
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
  await prisma.mensaje.create({
    data: {
      clienteId: updated.id,
      emisor: "admin",
      texto: "¡Gracias por confiar en la Asociación de Escritores Vanguardistas! Cualquier duda o consulta, no dudes en escribirnos a través de este medio. Te responderemos a la brevedad posible.",
      leido: false,
    },
  });
});

// ===================== CLIENTES: CRUD =====================
app.put("/clients/:id", auth, async (req, res) => {
  const {
    status, ci, nombres, apellidoPaterno, apellidoMaterno, sexo, ciudad,
    direccion, fechaNacimiento, extension, profesion, celular, email, nombreCompleto,
  } = req.body;
  const data: any = {};
  if (status !== undefined) data.status = status;
  if (ci !== undefined) data.ci = ci;
  if (nombres !== undefined) data.nombres = nombres;
  if (apellidoPaterno !== undefined) data.apellidoPaterno = apellidoPaterno;
  if (apellidoMaterno !== undefined) data.apellidoMaterno = apellidoMaterno;
  if (sexo !== undefined) data.sexo = sexo;
  if (ciudad !== undefined) data.ciudad = ciudad;
  if (direccion !== undefined) data.direccion = direccion;
  if (fechaNacimiento !== undefined) data.fechaNacimiento = fechaNacimiento;
  if (extension !== undefined) data.extension = extension;
  if (profesion !== undefined) data.profesion = profesion;
  if (celular !== undefined) data.celular = celular;
  if (email !== undefined) data.email = email;
  if (nombreCompleto !== undefined) data.nombreCompleto = nombreCompleto;
  res.json(await prisma.client.update({ where: { id: Number(req.params.id) }, data }));
});
app.put("/clients/:id/progreso", auth, async (req, res) => {
  const { librosHechos, articulosHechos, edicionesHechas } = req.body;
  res.json(
    await prisma.client.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(librosHechos !== undefined && { librosHechos }),
        ...(articulosHechos !== undefined && { articulosHechos }),
        ...(edicionesHechas !== undefined && { edicionesHechas }),
      },
    })
  );
});
app.put("/clients/:id/regenerar", auth, async (req, res) => {
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 4);
  res.json(await prisma.client.update({ where: { id: Number(req.params.id) }, data: { token, expiresAt } }));
});
app.delete("/clients/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.magazine.updateMany({ where: { clienteId: id }, data: { clienteId: null } });
  await prisma.book.updateMany({ where: { clienteId: id }, data: { clienteId: null } });
  await prisma.mensaje.deleteMany({ where: { clienteId: id } });
  await prisma.libroDetalle.deleteMany({ where: { clienteId: id } });
  await prisma.clienteTask.deleteMany({ where: { clienteId: id } });
  await prisma.entrega.deleteMany({ where: { clienteId: id } });
  await prisma.clienteArchivo.deleteMany({ where: { clienteId: id } });
  const pedidos = await prisma.pedido.findMany({ where: { clienteId: id }, select: { id: true } });
  const pedidoIds = pedidos.map(p => p.id);
  const items = await prisma.itemPedido.findMany({ where: { pedidoId: { in: pedidoIds } }, select: { id: true } });
  const itemIds = items.map(i => i.id);
  await prisma.revisionItem.deleteMany({ where: { itemPedidoId: { in: itemIds } } });
  await prisma.itemPedido.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
  await prisma.pedido.deleteMany({ where: { clienteId: id } });
  await prisma.client.delete({ where: { id } });
  res.json({ ok: true });
});
app.get("/clients/:id/credenciales", auth, async (req, res) => {
  const id = Number(req.params.id);
  const cliente = await prisma.client.findUnique({ where: { id }, select: { clientUsername: true } });
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
  res.json({ clientUsername: cliente.clientUsername });
});
app.post("/clients/:id/regenerar-credenciales", auth, async (req, res) => {
  const id = Number(req.params.id);
  const cliente = await prisma.client.findUnique({ where: { id } });
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

  let username = cliente.clientUsername;
  if (!username) {
    username = (cliente.ci || "").trim() || `cliente${id}`;
    let counter = 1;
    while (await prisma.client.findFirst({ where: { clientUsername: username!, NOT: { id } } })) {
      username = `${cliente.ci || "cliente" + id}${counter}`;
      counter++;
    }
  }

  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.client.update({
    where: { id },
    data: { clientUsername: username, clientPassword: hashedPassword, credencialesGeneradaAt: new Date(), debeCambiarPassword: true },
  });
  res.json({ clientUsername: username, clientPassword: password });
});
// ===================== PEDIDOS =====================
app.get("/pedidos", auth, async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    include: { cliente: true, items: { include: { edicion: { include: { magazine: true } } } } },
    orderBy: { creadoEn: "desc" },
  });
  res.json(pedidos);
});

app.get("/pedidos/:id", auth, async (req, res) => {
  const pedido = await prisma.pedido.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      cliente: true,
      items: {
        include: {
          edicion: { include: { magazine: true } },
          revisiones: { orderBy: { creadoEn: "asc" } },
        },
      },
    },
  });
  if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
  res.json(pedido);
});

app.put("/pedidos/:id/rechazar", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { motivoRechazo } = req.body;
  res.json(await prisma.pedido.update({ where: { id }, data: { estado: "rechazado", motivoRechazo } }));
});

app.put("/pedidos/:id/completar", auth, async (req, res) => {
  const id = Number(req.params.id);
  res.json(await prisma.pedido.update({ where: { id }, data: { estado: "completado" } }));
});

app.put("/pedidos/:id/ajustar-precio", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { montoTotal } = req.body;
  res.json(await prisma.pedido.update({ where: { id }, data: { montoTotal: Number(montoTotal) } }));
});
// Crear un pedido/entrega manual (sin pasar por el flujo de compra y pago)
app.post("/pedidos/manual", auth, async (req, res) => {
  const { clienteId, items } = req.body;

  if (!clienteId) return res.status(400).json({ error: "clienteId es requerido" });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Debes incluir al menos un item" });
  }

  const cliente = await prisma.client.findUnique({ where: { id: Number(clienteId) } });
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

  const itemsValidos = items.filter((it: any) => it.titulo && Number(it.precioUnitario) > 0);
  if (itemsValidos.length === 0) {
    return res.status(400).json({ error: "Los items deben tener título y un precio válido" });
  }

  const montoTotal = itemsValidos.reduce((sum: number, it: any) => sum + Number(it.precioUnitario), 0);

  const pedido = await prisma.pedido.create({
    data: {
      clienteId: Number(clienteId),
      montoTotal,
      montoPagado: 0,
      items: {
        create: itemsValidos.map((it: any) => ({
          tipo: it.tipo || "otro",
          titulo: it.titulo,
          precioUnitario: Number(it.precioUnitario),
          conIsbn: it.conIsbn || false,
          conSenapi: it.conSenapi || false,
        })),
      },
    },
    include: { items: true, cliente: true },
  });

  res.json(pedido);
});
app.delete("/items-pedido/:id", auth, async (req, res) => {
  const id = Number(req.params.id);

  try {
    await prisma.revisionItem.deleteMany({ where: { itemPedidoId: id } });
    const tareas = await prisma.tareaItem.findMany({ where: { itemPedidoId: id }, select: { id: true } });
    const tareaIds = tareas.map(t => t.id);
    if (tareaIds.length > 0) {
      await prisma.comentarioTarea.deleteMany({ where: { tareaId: { in: tareaIds } } });
      await prisma.tareaItem.deleteMany({ where: { itemPedidoId: id } });
    }
    await prisma.itemPedido.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar item de pedido:", error);
    res.status(500).json({ error: "Error interno al eliminar el ítem" });
  }
});
// ===================== ITEMS Y REVISIONES =====================
app.post("/items/:id/revision", auth, upload.array("archivos", 5), async (req: any, res) => {
  const itemId = Number(req.params.id);
  const { nota } = req.body;
  const archivos: string[] = [];
  if (req.files) {
    for (const file of req.files) {
      const url = await subirImagen(file.buffer, "revisiones", "auto");
      if (url) archivos.push(url);
    }
  }
  const ultimaRevision = await prisma.revisionItem.findFirst({
    where: { itemPedidoId: itemId },
    orderBy: { ronda: "desc" },
  });
  const nuevaRonda = (ultimaRevision?.ronda || 0) + 1;
  const revision = await prisma.revisionItem.create({
    data: { itemPedidoId: itemId, ronda: nuevaRonda, autorTipo: "admin", nota: nota || null, archivos },
  });
  try {
    const item = await prisma.itemPedido.findUnique({
      where: { id: itemId },
      include: { pedido: { include: { cliente: true } } },
    });
    if (item?.pedido?.cliente) {
      await enviarWhatsAppCliente(
        item.pedido.cliente.celular || "",
        item.pedido.cliente.nombreCompleto || "Cliente",
        "Nuevo avance disponible",
        "Revisa tu pedido",
        process.env.CLIENT_PORTAL_URL || ""
      );
    }
  } catch (err) {
    console.warn("No se pudo notificar:", err);
  }
  res.json(revision);
});

app.put("/items/:id/completar", auth, async (req, res) => {
  const id = Number(req.params.id);
  res.json(await prisma.itemPedido.update({ where: { id }, data: { estado: "completado" } }));
});

app.put("/items/:id/asignar-revista", auth, async (req, res) => {
  const itemId = Number(req.params.id);
  const { edicionId } = req.body;
  const item = await prisma.itemPedido.findUnique({ where: { id: itemId }, include: { pedido: true } });
  if (!item) return res.status(404).json({ error: "Ítem no encontrado" });
  const clienteId = item.pedido.clienteId;
  const existente = await prisma.itemPedido.findFirst({
    where: { edicionId, pedido: { clienteId }, NOT: { id: itemId } },
  });
  if (existente) return res.status(400).json({ error: "El autor ya tiene un artículo en esta edición" });
  const updated = await prisma.itemPedido.update({
    where: { id: itemId },
    data: { edicionId },
    include: { edicion: { include: { magazine: true } } },
  });
  res.json(updated);
});

// ===================== EDICIONES =====================
app.get("/ediciones", auth, async (req, res) => {
  const ediciones = await prisma.edicion.findMany({
    include: { magazine: { select: { id: true, title: true } } },
    orderBy: [{ magazine: { title: "asc" } }, { numero: "asc" }],
  });
  res.json(ediciones);
});

app.post("/ediciones/:id/archivo", auth, upload.single("archivo"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Archivo requerido" });
    const url = await subirImagen(req.file.buffer, "ediciones", "auto");
    const updated = await prisma.edicion.update({
      where: { id: Number(req.params.id) },
      data: { archivoUrl: url },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al subir archivo" });
  }
});
// ===================== NOTIFICACIONES =====================
app.get("/mensajes/no-leidos-count", auth, async (req, res) => {
  const count = await prisma.mensaje.count({
    where: { emisor: "cliente", leido: false },
  });
  res.json({ total: count });
});

app.get("/pagos/pendientes-count", auth, async (req, res) => {
  const count = await prisma.pago.count({
    where: { estado: "pendiente" },
  });
  res.json({ total: count });
});
// Marcar como leídos (cliente)
app.put("/cliente/mensajes/leidos", authCliente, async (req: any, res) => {
  await prisma.mensaje.updateMany({
    where: { clienteId: req.clienteId, emisor: "admin", leido: false },
    data: { leido: true },
  });
  res.json({ ok: true });
});
// ===================== MENSAJES ADMIN =====================
app.get("/mensajes", auth, async (req, res) => {
  const clientes = await prisma.client.findMany({
    where: { mensajes: { some: {} } },
    select: {
      id: true,
      nombres: true,
      apellidoPaterno: true,
      apellidoMaterno: true,
      nombreCompleto: true,
      fotografia: true,
      mensajes: { orderBy: { createdAt: "desc" }, take: 1, select: { texto: true, emisor: true, createdAt: true } },
      _count: { select: { mensajes: { where: { leido: false, emisor: "cliente" } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const resultado = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombreCompleto || [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(" ") || "Sin nombre",
    fotografia: c.fotografia,
    ultimoMensaje: c.mensajes[0] || null,
    noLeidos: c._count.mensajes,
  }));
  res.json(resultado);
});

app.get("/mensajes/:clienteId", auth, async (req, res) => {
  const clienteId = Number(req.params.clienteId);
  const mensajes = await prisma.mensaje.findMany({ where: { clienteId }, orderBy: { createdAt: "asc" } });
  res.json(mensajes);
});

app.post("/mensajes/:clienteId", auth, upload.array("archivos", 5), async (req: any, res) => {
  const clienteId = Number(req.params.clienteId);
  const { texto } = req.body;
  const archivos: string[] = [];

  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files) {
      const url = await subirImagen(file.buffer, "mensajes", "auto");
      if (url) archivos.push(url);
    }
  }

  if (!texto?.trim() && archivos.length === 0) {
    return res.status(400).json({ error: "El mensaje no puede estar vacío" });
  }

  const mensaje = await prisma.mensaje.create({
    data: {
      clienteId,
      emisor: "admin",
      texto: texto || "",
      archivos,
      leido: false,
    },
  });

  res.json(mensaje);
});

app.put("/mensajes/:clienteId/leidos", auth, async (req, res) => {
  const clienteId = Number(req.params.clienteId);
  await prisma.mensaje.updateMany({
    where: { clienteId, emisor: "cliente", leido: false },
    data: { leido: true },
  });
  res.json({ ok: true });
});

// ===================== ARCHIVOS CLIENTE (admin) =====================
app.get("/clients/:id/archivos", auth, async (req, res) => {
  const clienteId = Number(req.params.id);
  const cliente = await prisma.client.findUnique({ where: { id: clienteId }, select: { id: true } });
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
  const archivos = await prisma.clienteArchivo.findMany({ where: { clienteId }, orderBy: { createdAt: "desc" } });
  res.json(archivos);
});

// ===================== CLIENTE (endpoints propios) =====================
app.get("/cliente/me", authCliente, async (req: any, res) => {
  const cliente = await prisma.client.findUnique({
    where: { id: req.clienteId },
    select: {
      id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, sexo: true, ciudad: true,
      ci: true, direccion: true, fechaNacimiento: true, extension: true, profesion: true, celular: true,
      email: true, fotografia: true, fotoCarnet: true, clientUsername: true, credencialesGeneradaAt: true, status: true,
    },
  });
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
  res.json(cliente);
});

app.get("/cliente/mensajes", authCliente, async (req: any, res) => {
  const mensajes = await prisma.mensaje.findMany({
    where: { clienteId: req.clienteId },
    orderBy: { createdAt: "asc" },
  });
  res.json(mensajes);
});
app.get("/cliente/mensajes/no-leidos-count", authCliente, async (req: any, res) => {
  const count = await prisma.mensaje.count({
    where: { clienteId: req.clienteId, emisor: "admin", leido: false },
  });
  res.json({ total: count });
});
app.get("/cliente/progreso", authCliente, async (req: any, res) => {
  const cliente = await prisma.client.findUnique({
    where: { id: req.clienteId },
    select: {
      pideLibros: true, cantLibros: true, librosHechos: true, pideArticulos: true,
      cantArticulos: true, articulosHechos: true, pideDirector: true, edicionesHechas: true, pideFundador: true,
    },
  });
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
  res.json(cliente);
});

app.get("/cliente/entregas", authCliente, async (req: any, res) => {
  const entregas = await prisma.entrega.findMany({
    where: { clienteId: req.clienteId },
    orderBy: { createdAt: "desc" },
    include: { cliente: { select: { nombreCompleto: true } } },
  });
  res.json(entregas);
});

app.post("/cliente/mensajes", authCliente, upload.array("archivos", 5), async (req: any, res) => {
  const { texto } = req.body;
  const archivos: string[] = [];

  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files) {
      const url = await subirImagen(file.buffer, "mensajes", "auto");
      if (url) archivos.push(url);
    }
  }

  if (!texto?.trim() && archivos.length === 0) {
    return res.status(400).json({ error: "El mensaje no puede estar vacío" });
  }

  const mensaje = await prisma.mensaje.create({
    data: {
      clienteId: req.clienteId,
      emisor: "cliente",
      texto: texto || "",
      archivos,
      leido: false,
    },
  });

  try {
    const noLeidos = await prisma.mensaje.count({
      where: { clienteId: req.clienteId, emisor: "cliente", leido: false },
    });
    if (noLeidos === 1) {
      const { notificarAdminMensaje } = await import("./whatsapp");
      const cliente = await prisma.client.findUnique({
        where: { id: req.clienteId },
        select: { nombreCompleto: true },
      });
      await notificarAdminMensaje(cliente?.nombreCompleto || "Cliente");
    }
  } catch (err) {
    console.warn("No se pudo notificar:", err);
  }

  res.json(mensaje);
});
app.get("/admin/sesiones", auth, async (req: any, res) => {
  const sesiones = await prisma.sesionAdmin.findMany({
    where: { userId: req.user.id, activa: true },
    orderBy: { ultimaActividad: "desc" },
  });
  res.json(
    sesiones.map((s) => ({
      id: s.id,
      dispositivo: s.dispositivo,
      ip: s.ip,
      creadoEn: s.creadoEn,
      ultimaActividad: s.ultimaActividad,
      esActual: s.id === req.user.sessionId,
    }))
  );
});

app.delete("/admin/sesiones/:id", auth, async (req: any, res) => {
  const { id } = req.params;
  const sesion = await prisma.sesionAdmin.findUnique({ where: { id } });
  if (!sesion || sesion.userId !== req.user.id) {
    return res.status(404).json({ error: "Sesión no encontrada" });
  }
  await prisma.sesionAdmin.update({ where: { id }, data: { activa: false } });
  res.json({ ok: true, eraActual: sesion.id === req.user.sessionId });
});

app.post("/admin/logout", auth, async (req: any, res) => {
  if (req.user.sessionId) {
    await prisma.sesionAdmin
      .update({ where: { id: req.user.sessionId }, data: { activa: false } })
      .catch(() => {});
  }
  res.json({ ok: true });
});
app.put("/admin/password", auth, async (req: any, res) => {
  const { passwordActual, passwordNueva } = req.body;
  if (!passwordNueva) return res.status(400).json({ error: "La nueva contraseña es requerida" });
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  if (!user.debeCambiarPassword) {
    if (!passwordActual) return res.status(400).json({ error: "La contraseña actual es requerida" });
    const valida = await bcrypt.compare(passwordActual, user.password);
    if (!valida) return res.status(401).json({ error: "Contraseña actual incorrecta" });
  }

  const hashedPassword = await bcrypt.hash(passwordNueva, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword, debeCambiarPassword: false } });
  res.json({ ok: true, mensaje: "Contraseña actualizada correctamente" });
});
app.put("/cliente/password", authCliente, async (req: any, res) => {
  const { passwordActual, passwordNueva } = req.body;
  if (!passwordNueva) return res.status(400).json({ error: "La nueva contraseña es requerida" });
  const cliente = await prisma.client.findUnique({ where: { id: req.clienteId }, select: { clientPassword: true, debeCambiarPassword: true } });
  if (!cliente || !cliente.clientPassword) return res.status(400).json({ error: "No tienes contraseña configurada" });

  if (!cliente.debeCambiarPassword) {
    if (!passwordActual) return res.status(400).json({ error: "La contraseña actual es requerida" });
    const valida = await bcrypt.compare(passwordActual, cliente.clientPassword);
    if (!valida) return res.status(401).json({ error: "Contraseña actual incorrecta" });
  }

  const hashedPassword = await bcrypt.hash(passwordNueva, 10);
  await prisma.client.update({ where: { id: req.clienteId }, data: { clientPassword: hashedPassword, debeCambiarPassword: false } });
  res.json({ ok: true, mensaje: "Contraseña actualizada correctamente" });
});

app.put("/cliente/datos", authCliente, async (req: any, res) => {
  const cliente = await prisma.client.findUnique({
    where: { id: req.clienteId },
    select: { credencialesGeneradaAt: true },
  });
  if (!cliente || !cliente.credencialesGeneradaAt) return res.status(400).json({ error: "No tienes permiso para editar datos" });
  const ahora = new Date();
  const limite = new Date(cliente.credencialesGeneradaAt.getTime() + 10 * 60 * 60 * 1000);
  if (ahora > limite) return res.status(403).json({ error: "El tiempo de edición ha vencido. Contacta al administrador." });
  const { nombres, apellidoPaterno, apellidoMaterno, sexo, ciudad, direccion, fechaNacimiento, profesion, celular, email } = req.body;
  const updated = await prisma.client.update({
    where: { id: req.clienteId },
    data: {
      ...(nombres && { nombres }),
      ...(apellidoPaterno && { apellidoPaterno }),
      ...(apellidoMaterno !== undefined && { apellidoMaterno }),
      ...(sexo && { sexo }),
      ...(ciudad && { ciudad }),
      ...(direccion && { direccion }),
      ...(fechaNacimiento && { fechaNacimiento }),
      ...(profesion && { profesion }),
      ...(celular && { celular }),
      ...(email && { email }),
    },
  });
  res.json(updated);
});

app.post("/cliente/archivos/libro/:libroId", authCliente, upload.single("archivo"), async (req: any, res) => {
  const libroId = Number(req.params.libroId);
  const { titulo, notas } = req.body;
  const archivoUrl = req.file ? await subirImagen(req.file.buffer, "clientes/libros", "auto") : null;
  const archivo = await prisma.clienteArchivo.create({
    data: { clienteId: req.clienteId, tipo: "libro", referenciaId: libroId, titulo: titulo || null, notas: notas || null, archivoUrl: archivoUrl ?? undefined },
  });
  res.json(archivo);
});

app.post("/cliente/archivos/articulo/:articuloId", authCliente, upload.single("archivo"), async (req: any, res) => {
  const articuloId = Number(req.params.articuloId);
  const { titulo, notas } = req.body;
  const archivoUrl = req.file ? await subirImagen(req.file.buffer, "clientes/articulos", "auto") : null;
  const archivo = await prisma.clienteArchivo.create({
    data: { clienteId: req.clienteId, tipo: "articulo", referenciaId: articuloId, titulo: titulo || null, notas: notas || null, archivoUrl: archivoUrl ?? undefined },
  });
  res.json(archivo);
});

app.post("/cliente/archivos/director", authCliente, upload.single("archivo"), async (req: any, res) => {
  const { titulo, notas } = req.body;
  const archivoUrl = req.file ? await subirImagen(req.file.buffer, "clientes/director", "auto") : null;
  const archivo = await prisma.clienteArchivo.create({
    data: { clienteId: req.clienteId, tipo: "director", titulo: titulo || null, notas: notas || null, archivoUrl: archivoUrl ?? undefined },
  });
  res.json(archivo);
});

app.post("/cliente/archivos/fundador/:articuloId", authCliente, upload.single("archivo"), async (req: any, res) => {
  const articuloId = Number(req.params.articuloId);
  const { titulo, notas } = req.body;
  const archivoUrl = req.file ? await subirImagen(req.file.buffer, "clientes/fundador", "auto") : null;
  const archivo = await prisma.clienteArchivo.create({
    data: { clienteId: req.clienteId, tipo: "fundador", referenciaId: articuloId, titulo: titulo || null, notas: notas || null, archivoUrl: archivoUrl ?? undefined },
  });
  res.json(archivo);
});

app.get("/cliente/archivos", authCliente, async (req: any, res) => {
  const archivos = await prisma.clienteArchivo.findMany({ where: { clienteId: req.clienteId }, orderBy: { createdAt: "desc" } });
  res.json(archivos);
});

app.post("/cliente/pedidos", authCliente, async (req: any, res) => {
  const { items } = req.body;
  const precios: Record<string, number> = { libroA: 800, libroB: 1100, libroC: 1600, director: 2000, fundador: 800, autor: 500 };
  const montoTotal = items.reduce((sum: number, item: any) => sum + (precios[item.tipo] || 0), 0);
  const pedido = await prisma.pedido.create({
    data: {
      clienteId: req.clienteId,
      montoTotal,
      montoPagado: 0,
      items: {
        create: items.map((item: any) => ({
          tipo: item.tipo,
          titulo: item.titulo || null,
          conSenapi: item.conSenapi || false,
          conIsbn: item.conIsbn || false,
          periodicidad: item.periodicidad || null,
          tipoAutor: item.tipoAutor || null,
          asociacionEncargaTitulo: item.asociacionEncargaTitulo || false,
          notas: item.notas || null,
          archivoWord: item.archivoWord || null,
          archivoPdf: item.archivoPdf || null,
        })),
      },
    },
    include: { items: true },
  });
  try {
    const { notificarAdminMensaje } = await import("./whatsapp");
    const cliente = await prisma.client.findUnique({ where: { id: req.clienteId } });
    const nombre = cliente?.nombreCompleto || "Cliente";
    await notificarAdminMensaje(`Nuevo pedido de ${nombre} (${items.length} ítems) por Bs ${montoTotal}`);
  } catch (err) {
    console.warn("No se pudo notificar:", err);
  }
  res.json(pedido);
});

app.get("/cliente/pedidos", authCliente, async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: req.clienteId },
    include: {
      items: {
        include: {
          revisiones: true,
          tareas: { include: { comentarios: { orderBy: { creadoEn: "asc" } } }, orderBy: { creadoEn: "asc" } },
        },
      },
    },
    orderBy: { creadoEn: "desc" },
  });
  res.json(pedidos);
});

app.get("/cliente/pedidos/:id", authCliente, async (req: any, res) => {
  const pedido = await prisma.pedido.findFirst({
    where: { id: Number(req.params.id), clienteId: req.clienteId },
    include: {
      items: {
        include: {
          edicion: { include: { magazine: true } },
          revisiones: { orderBy: { creadoEn: "asc" } },
          tareas: { include: { comentarios: { orderBy: { creadoEn: "asc" } } }, orderBy: { creadoEn: "asc" } },
        },
      },
    },
  });
  if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
  res.json(pedido);
});

app.post("/cliente/items/:id/revision", authCliente, upload.array("archivos", 5), async (req: any, res) => {
  const itemId = Number(req.params.id);
  const { nota } = req.body;
  const archivos: string[] = [];
  if (req.files) {
    for (const file of req.files) {
      const url = await subirImagen(file.buffer, "revisiones", "auto");
      if (url) archivos.push(url);
    }
  }
  if (!nota && archivos.length === 0) return res.status(400).json({ error: "Debes escribir una observación o adjuntar un archivo" });
  const ultimaRevision = await prisma.revisionItem.findFirst({ where: { itemPedidoId: itemId }, orderBy: { ronda: "desc" } });
  const nuevaRonda = (ultimaRevision?.ronda || 0) + 1;
  const revision = await prisma.revisionItem.create({
    data: { itemPedidoId: itemId, ronda: nuevaRonda, autorTipo: "cliente", nota, archivos },
  });
  await prisma.itemPedido.update({ where: { id: itemId }, data: { estado: "en revision" } });
  try {
    const { notificarAdminMensaje } = await import("./whatsapp");
    const item = await prisma.itemPedido.findUnique({
      where: { id: itemId },
      include: { pedido: { include: { cliente: true } } },
    });
    await notificarAdminMensaje(`El cliente ${item?.pedido?.cliente?.nombreCompleto || "Cliente"} envió observaciones en un ítem`);
  } catch (err) {
    console.warn("No se pudo notificar:", err);
  }
  res.json(revision);
});

// ===================== ENTREGAS =====================
app.get("/entregas", auth, async (req, res) => {
  res.json(
    await prisma.entrega.findMany({
      orderBy: { createdAt: "desc" },
      include: { cliente: { include: { clienteTasks: true } } },
    })
  );
});
app.put("/entregas/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { estado, fechaEntrega } = req.body;
  const data: any = {};
  if (estado !== undefined) {
    data.estado = estado;
    data.fechaEntrega = estado === "entregado" ? new Date() : null;
  }
  if (fechaEntrega !== undefined) data.fechaEntrega = new Date(fechaEntrega);
  res.json(
    await prisma.entrega.update({
      where: { id },
      data,
      include: { cliente: { include: { clienteTasks: true } } },
    })
  );
});
app.delete("/entregas/:id", auth, async (req, res) => {
  await prisma.entrega.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== BÚSQUEDA =====================
app.get("/search", auth, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ magazines: [], books: [] });
  const [magazines, books] = await Promise.all([
    prisma.magazine.findMany({
      where: {
        OR: [
          { director: { name: { contains: q, mode: "insensitive" } } },
          { articles: { some: { authors: { some: { name: { contains: q, mode: "insensitive" } } } } } },
        ],
      },
      include: { director: true, articles: { include: { authors: true } } },
    }),
    prisma.book.findMany({ where: { author: { name: { contains: q, mode: "insensitive" } } }, include: { author: true } }),
  ]);
  res.json({ magazines, books });
});

// ===================== ESTADÍSTICAS =====================
app.get("/stats", auth, async (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const [
    clientesTotal, clientesPendientes, clientesFormularioLlenado, clientesEnProceso, clientesProcesados,
    entregasTotal, entregasPendientes, entregasEntregadas,
    tareasTotal, tareasPendientes, tareasCompletadas,
    clienteTareasTotal, clienteTareasPendientes, clienteTareasCompletadas,
    revistasTotal, librosTotal,
  ] = await Promise.all([
    prisma.client.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.client.count({ where: { status: "pendiente", createdAt: { gte: start, lte: end } } }),
    prisma.client.count({ where: { status: "formulario llenado", createdAt: { gte: start, lte: end } } }),
    prisma.client.count({ where: { status: "en proceso", createdAt: { gte: start, lte: end } } }),
    prisma.client.count({ where: { status: "procesado", createdAt: { gte: start, lte: end } } }),
    prisma.entrega.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.entrega.count({ where: { estado: "pendiente", createdAt: { gte: start, lte: end } } }),
    prisma.entrega.count({ where: { estado: "entregado", createdAt: { gte: start, lte: end } } }),
    prisma.task.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.task.count({ where: { completed: false, createdAt: { gte: start, lte: end } } }),
    prisma.task.count({ where: { completed: true, createdAt: { gte: start, lte: end } } }),
    prisma.clienteTask.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.clienteTask.count({ where: { completada: false, createdAt: { gte: start, lte: end } } }),
    prisma.clienteTask.count({ where: { completada: true, createdAt: { gte: start, lte: end } } }),
    prisma.magazine.count(),
    prisma.book.count(),
  ]);
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  res.json({
    mesActual: `${meses[now.getMonth()]} ${now.getFullYear()}`,
    clientes: { total: clientesTotal, pendientes: clientesPendientes, formularioLlenado: clientesFormularioLlenado, enProceso: clientesEnProceso, procesados: clientesProcesados },
    entregas: { total: entregasTotal, pendientes: entregasPendientes, entregadas: entregasEntregadas },
    tareas: {
      manuales: { total: tareasTotal, pendientes: tareasPendientes, completadas: tareasCompletadas },
      clientes: { total: clienteTareasTotal, pendientes: clienteTareasPendientes, completadas: clienteTareasCompletadas },
    },
    revistas: revistasTotal,
    libros: librosTotal,
  });
});

// ===================== DAY NOTES =====================
app.get("/day-notes", auth, async (req, res) => {
  const userId = req.user!.id;
  res.json(await prisma.dayNote.findMany({ where: { userId }, orderBy: { fecha: "asc" } }));
});
app.post("/day-notes", auth, async (req, res) => {
  const userId = req.user!.id;
  const { text, fecha } = req.body;
  res.json(await prisma.dayNote.create({ data: { text, fecha, userId } }));
});
app.delete("/day-notes/:id", auth, async (req, res) => {
  await prisma.dayNote.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ===================== LIBRO DETALLES =====================
app.get("/clients/:id/libro-detalles", auth, async (req, res) => {
  res.json(
    await prisma.libroDetalle.findMany({ where: { clienteId: Number(req.params.id) }, orderBy: { numeroLibro: "asc" } })
  );
});
app.post("/clients/form/:token/libro-detalles", async (req, res) => {
  const client = await prisma.client.findUnique({ where: { token: req.params.token } });
  if (!client) return res.status(404).json({ error: "Link no válido" });
  if (new Date() > client.expiresAt) return res.status(410).json({ error: "Link expirado" });
  const { detalles } = req.body;
  await prisma.libroDetalle.deleteMany({ where: { clienteId: client.id } });
  if (detalles && detalles.length > 0) {
    await prisma.libroDetalle.createMany({
      data: detalles.map((d: any) => ({
        clienteId: client.id,
        numeroLibro: d.numeroLibro,
        categoria: d.categoria,
        isbn: d.isbn,
        senapi: d.senapi,
        prioridad: d.prioridad,
      })),
    });
  }
  res.json({ ok: true });
});

// ===================== ITEMS PEDIDO (admin) =====================
app.get("/items-pedido", auth, async (req, res) => {
  const items = await prisma.itemPedido.findMany({
    include: {
      pedido: {
        include: { cliente: { select: { id: true, nombreCompleto: true, nombres: true, apellidoPaterno: true } } },
      },
      tareas: { include: { comentarios: { orderBy: { creadoEn: "asc" } } }, orderBy: { creadoEn: "asc" } },
    },
    orderBy: { id: "desc" },
  });
  const result = items.map((item) => ({ ...item, cliente: item.pedido.cliente, creadoEn: item.pedido.creadoEn }));
  res.json(result);
});

app.put("/items-pedido/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { estado, notas } = req.body;
  const data: any = {};
  if (estado !== undefined) data.estado = estado;
  if (notas !== undefined) data.notas = notas;
  const updated = await prisma.itemPedido.update({ where: { id }, data, include: { pedido: { include: { cliente: true } } } });
  res.json({ ...updated, cliente: updated.pedido.cliente, creadoEn: updated.pedido.creadoEn });
});
app.post("/items-pedido/:id/archivo", auth, upload.single("archivo"), async (req: any, res) => {
  const id = Number(req.params.id);
  const { tipo } = req.body;
  if (!req.file) return res.status(400).json({ error: "Archivo requerido" });
  const carpeta = tipo === "word" ? "items/word" : "items/pdf";
  const url = await subirImagen(req.file.buffer, carpeta, "auto");
  const data: any = {};
  if (tipo === "word") data.archivoWord = url;
  else if (tipo === "pdf") data.archivoPdf = url;
  else return res.status(400).json({ error: "Tipo inválido" });
  const updated = await prisma.itemPedido.update({ where: { id }, data, include: { pedido: { include: { cliente: true } } } });
  res.json({ ...updated, cliente: updated.pedido.cliente, creadoEn: updated.pedido.creadoEn });
});
// ===================== TAREAS DE ITEM =====================
app.post("/items/:id/tareas", auth, async (req, res) => {
  const itemPedidoId = Number(req.params.id);
  const { titulo, descripcion } = req.body;
  if (!titulo?.trim()) return res.status(400).json({ error: "El título es requerido" });
  const tarea = await prisma.tareaItem.create({
    data: { itemPedidoId, titulo, descripcion: descripcion || null },
  });
  res.json(tarea);
});

app.put("/tareas/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { completada, titulo, descripcion } = req.body;
  const data: any = {};
  if (completada !== undefined) data.completada = completada;
  if (titulo !== undefined) data.titulo = titulo;
  if (descripcion !== undefined) data.descripcion = descripcion;
  const tarea = await prisma.tareaItem.update({ where: { id }, data });
  res.json(tarea);
});

app.delete("/tareas/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.comentarioTarea.deleteMany({ where: { tareaId: id } });
  await prisma.tareaItem.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/tareas/:id/comentarios", auth, upload.array("archivos", 5), async (req: any, res) => {
  const tareaId = Number(req.params.id);
  const { texto } = req.body;
  const archivos: string[] = [];
  if (req.files) {
    for (const file of req.files) {
      const url = await subirImagen(file.buffer, "tareas", "auto");
      if (url) archivos.push(url);
    }
  }
  if (!texto?.trim() && archivos.length === 0) return res.status(400).json({ error: "Escribe un comentario o adjunta un archivo" });
  const comentario = await prisma.comentarioTarea.create({
    data: { tareaId, autorTipo: "admin", texto: texto || null, archivos },
  });
  await prisma.tareaItem.update({ where: { id: tareaId }, data: { vistaCliente: false } });
  res.json(comentario);
});
app.get("/cliente/tareas/no-vistas-count", authCliente, async (req: any, res) => {
  const count = await prisma.tareaItem.count({
    where: {
      vistaCliente: false,
      item: { pedido: { clienteId: req.clienteId } },
    },
  });
  res.json({ total: count });
});

app.put("/cliente/tareas/vistas", authCliente, async (req: any, res) => {
  await prisma.tareaItem.updateMany({
    where: {
      vistaCliente: false,
      item: { pedido: { clienteId: req.clienteId } },
    },
    data: { vistaCliente: true },
  });
  res.json({ ok: true });
});
app.post("/cliente/tareas/:id/comentarios", authCliente, upload.array("archivos", 5), async (req: any, res) => {
  const tareaId = Number(req.params.id);
  const tarea = await prisma.tareaItem.findUnique({
    where: { id: tareaId },
    include: { item: { include: { pedido: true } } },
  });
  if (!tarea || tarea.item.pedido.clienteId !== req.clienteId) {
    return res.status(403).json({ error: "No tienes acceso a esta tarea" });
  }
  const { texto } = req.body;
  const archivos: string[] = [];
  if (req.files) {
    for (const file of req.files) {
      const url = await subirImagen(file.buffer, "tareas", "auto");
      if (url) archivos.push(url);
    }
  }
  if (!texto?.trim() && archivos.length === 0) return res.status(400).json({ error: "Escribe un comentario o adjunta un archivo" });
  const comentario = await prisma.comentarioTarea.create({
    data: { tareaId, autorTipo: "cliente", texto: texto || null, archivos },
  });
  res.json(comentario);
});
// ===================== NOTIFICACIONES =====================

// ===================== INICIO SERVIDOR =====================
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
  console.log(`🌐 Acceso local: http://localhost:${PORT}`);
  console.log(`🚀 CORS permitido para: ${allowedOrigins.join(", ")}`);
});