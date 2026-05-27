import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";
import { useMesActual } from "../hooks/useMesActual";
import NavegadorMes from "../components/NavegadorMes";

const API_URL = import.meta.env.VITE_API_URL;

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Extension = "LP" | "CB" | "SC" | "OR" | "PT" | "CH" | "TJ" | "BN" | "PD" | "QR";
type Sexo = "Masculino" | "Femenino";

interface Client {
  id: number;
  token: string;
  expiresAt: string;
  status: string;
  createdAt: string;

  ci: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  sexo: Sexo | null;
  ciudad: string | null;
  extension: Extension | null;

  nombreCompleto: string | null;
  direccion: string | null;
  fechaNacimiento: string | null;
  profesion: string | null;
  celular: string | null;
  email: string | null;

  pideLibros: boolean;
  cantLibros: number;
  librosHechos: number;

  pideArticulos: boolean;
  cantArticulos: number;
  articulosHechos: number;

  pideDirector: boolean;
  edicionesHechas: number;

  pideFundador: boolean;

  notasServicio: string | null;
  fotografia: string | null;
  fotoCarnet: string | null;
  fotoCarnet2?: string | null; // campo extra para el reverso
}

interface SenapiPayload {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  sexo: string;
  ci: string;
  extension: string;
  direccion: string;
  celular: string;
  email: string;
  fechaNacimiento: string;
  ciudad: string;
}

// ─── Helpers menores ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        display: "inline-block", width: 16, height: 16,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTop: "2px solid white", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </>
  );
}

function getStatusColor(status: string) {
  if (status === "procesado") return { bg: "#14532d", color: "#22c55e" };
  if (status === "en proceso") return { bg: "#1e3a5f", color: "#60a5fa" };
  if (status === "formulario llenado") return { bg: "#312e81", color: "#a78bfa" };
  return { bg: "#422006", color: "#f59e0b" };
}

function getServicios(c: Client): string {
  const s: string[] = [];
  if (c.pideLibros) s.push(`${c.cantLibros} Libro(s)`);
  if (c.pideArticulos) s.push(`${c.cantArticulos} Artículo(s)`);
  if (c.pideDirector) s.push("Director");
  if (c.pideFundador) s.push("Fundador");
  return s.join(" · ") || "—";
}

function getNombreDisplay(c: Client): string {
  if (c.nombres || c.apellidoPaterno) {
    return [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(" ");
  }
  return c.nombreCompleto || "Sin nombre";
}

function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "Sí, confirmar", icon = "🗑️" }: {
  message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; icon?: string;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "0 20px" }}>
      <div style={{ background: "#1e293b", padding: 32, borderRadius: 16, width: "100%", maxWidth: 360, color: "white", textAlign: "center", border: "1px solid #334155" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
        <h3 style={{ marginBottom: 10 }}>¿Confirmar?</h3>
        <p style={{ color: "#94a3b8", marginBottom: 28, fontSize: 14 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={btnGray}>Cancelar</button>
          <button onClick={onConfirm} style={btnGreen}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function BarraProgreso({ actual, total, color }: { actual: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((actual / total) * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{actual}/{total}</span>
        <span style={{ color, fontSize: 12, fontWeight: "bold" }}>{pct}%</span>
      </div>
      <div style={{ background: "#334155", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function exportPDF(clients: Client[], monthLabel: string) {
  const rows = clients.map((c, i) => `
    <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"}">
      <td>${getNombreDisplay(c)}</td>
      <td>${c.fotografia ? `<img src="${c.fotografia}" style="width:50px;height:50px;object-fit:cover;border-radius:50%;border:2px solid #3b82f6;cursor:pointer;" onclick="window.open('${c.fotografia}','_blank')" />` : "<span style='color:#94a3b8'>Sin foto</span>"}</td>
      <td>${c.fotoCarnet ? `<img src="${c.fotoCarnet}" style="width:80px;height:50px;object-fit:cover;border-radius:4px;border:2px solid #64748b;cursor:pointer;" onclick="window.open('${c.fotoCarnet}','_blank')" />` : "—"}</td>
      <td>${c.ci || "—"}</td>
      <td>${c.direccion || "—"}</td>
      <td>${c.fechaNacimiento || "—"}</td>
      <td>${c.extension || "—"}</td>
      <td>${c.celular || "—"}</td>
      <td>${c.email || "—"}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte ${monthLabel}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#1e293b;}h1{color:#1e3a5f;}table{width:100%;border-collapse:collapse;font-size:12px;}th{background:#1e3a5f;color:white;padding:10px 12px;text-align:left;}td{padding:9px 12px;border-bottom:1px solid #e2e8f0;vertical-align:middle;}</style></head><body><h1>📋 Reporte — ${monthLabel}</h1><p>${clients.length} cliente(s) · ${new Date().toLocaleDateString()}</p><table><thead><tr><th>Nombre</th><th>Foto</th><th>Carnet</th><th>C.I.</th><th>Dirección</th><th>Fecha Nac.</th><th>Ext.</th><th>Celular</th><th>Email</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

// ─── Componente principal ─────────────────────────────────────────────────────
function Clients() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const { mes, anio, mesLabel, anterior, siguiente, esActual, filtrarPorMes } = useMesActual();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [view, setView] = useState<"lista" | "reporte">("lista");

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [credenciales, setCredenciales] = useState<{ clientUsername: string; clientPassword?: string } | null>(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => () => {});
  const [confirmLabel, setConfirmLabel] = useState("Sí, confirmar");
  const [confirmIcon, setConfirmIcon] = useState("🗑️");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/clients`, { headers });
    if (res.ok) setClients(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clientesMes = filtrarPorMes(clients);

  const showConfirm = (message: string, action: () => void, label = "Sí, confirmar", icon = "🗑️") => {
    setConfirmMessage(message);
    setConfirmAction(() => () => action());
    setConfirmLabel(label);
    setConfirmIcon(icon);
    setConfirmOpen(true);
  };

  const create = async () => {
    setCreating(true);
    try {
      await fetch(`${API_URL}/clients`, { method: "POST", headers, body: JSON.stringify({ nombreCompleto: newName }) });
      setNewName("");
      await load();
    } finally { setCreating(false); }
  };

  const copyLink = (c: Client) => {
    const link = `${window.location.origin}/formulario/${c.token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copiarSenapi = async (c: Client) => {
    const payload: SenapiPayload = {
      nombres: c.nombres ?? "",
      apellidoPaterno: c.apellidoPaterno ?? "",
      apellidoMaterno: c.apellidoMaterno ?? "",
      sexo: c.sexo ?? "",
      ci: c.ci ?? "",
      extension: c.extension ?? "",
      direccion: c.direccion ?? "",
      celular: c.celular ?? "",
      email: c.email ?? "",
      fechaNacimiento: c.fechaNacimiento ?? "",
      ciudad: c.ciudad ?? "",
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    alert("✅ Datos SENAPI copiados al portapapeles");
  };

  const regenerar = async (id: number) => {
    setRegeneratingId(id);
    try {
      await fetch(`${API_URL}/clients/${id}/regenerar`, { method: "PUT", headers });
      await load();
    } finally { setRegeneratingId(null); }
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await fetch(`${API_URL}/clients/${id}`, { method: "PUT", headers, body: JSON.stringify({ status }) });
      await load();
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    } finally { setUpdatingId(null); }
  };

  const updateProgreso = async (id: number, campo: string, valor: number) => {
    const res = await fetch(`${API_URL}/clients/${id}/progreso`, { method: "PUT", headers, body: JSON.stringify({ [campo]: valor }) });
    const data = await res.json();
    setSelected(data);
    setClients(prev => prev.map(c => c.id === id ? data : c));
  };

  const subirProgreso = (campo: string, actual: number, total: number) => {
    if (!selected || actual >= total) return;
    const nuevo = actual + 1;
    const nombres: Record<string, string> = {
      articulosHechos: "artículo", librosHechos: "libro", edicionesHechas: "edición",
    };
    showConfirm(
      `¿Confirmas que el ${nuevo}° ${nombres[campo]} de ${getNombreDisplay(selected)} está completado?`,
      async () => { setConfirmOpen(false); await updateProgreso(selected.id, campo, nuevo); },
      "✅ Sí, completado", "✅",
    );
  };

  const bajarProgreso = async (campo: string, actual: number) => {
    if (!selected || actual <= 0) return;
    await updateProgreso(selected.id, campo, actual - 1);
  };

  const remove = (c: Client) => {
    showConfirm(
      `¿Eliminar al cliente "${getNombreDisplay(c)}" permanentemente?`,
      async () => {
        setConfirmOpen(false);
        setDeletingId(c.id);
        try {
          await fetch(`${API_URL}/clients/${c.id}`, { method: "DELETE", headers });
          if (selected?.id === c.id) setSelected(null);
          await load();
        } finally { setDeletingId(null); }
      },
      "Sí, eliminar", "🗑️",
    );
  };

  const isExpired = (expiresAt: string) => new Date() > new Date(expiresAt);
  const getDaysLeft = (expiresAt: string) =>
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const cargarCredenciales = async (clienteId: number) => {
    try {
      const res = await fetch(`${API_URL}/clients/${clienteId}/credenciales`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCredenciales(data);
      }
    } catch (err) { console.error("Error al cargar credenciales", err); }
  };

  const regenerarCredenciales = async (clienteId: number) => {
    try {
      const res = await fetch(`${API_URL}/clients/${clienteId}/regenerar-credenciales`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCredenciales({ clientUsername: data.clientUsername, clientPassword: data.clientPassword });
        setMostrarPassword(true);
      }
    } catch (err) { console.error("Error al regenerar credenciales", err); }
  };

  useEffect(() => {
    if (selected) {
      cargarCredenciales(selected.id);
      setMostrarPassword(false);
    }
  }, [selected?.id]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {confirmOpen && <ConfirmModal message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} confirmLabel={confirmLabel} icon={confirmIcon} />}

      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>👥 Clientes</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Gestiona los clientes y su progreso de producción.
      </p>

      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} style={btnGray}>← Volver</button>
          <div style={{ background: "#1e293b", padding: isMobile ? 20 : 28, borderRadius: 14, marginTop: 20 }}>
            {/* Cabecera */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ marginBottom: 6, fontSize: isMobile ? 18 : 22 }}>{getNombreDisplay(selected)}</h2>
                <span style={{ fontSize: 12, padding: "3px 12px", borderRadius: 99, background: getStatusColor(selected.status).bg, color: getStatusColor(selected.status).color, fontWeight: "bold" }}>{selected.status}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => updateStatus(selected.id, "pendiente")} disabled={updatingId === selected.id} style={{ ...btnGray, fontSize: 12 }}>⏳</button>
                <button onClick={() => updateStatus(selected.id, "formulario llenado")} disabled={updatingId === selected.id} style={{ ...btnPurple, fontSize: 12 }}>📝</button>
                <button onClick={() => updateStatus(selected.id, "en proceso")} disabled={updatingId === selected.id} style={{ ...btnBlue, fontSize: 12 }}>🔄</button>
                <button onClick={() => updateStatus(selected.id, "procesado")} disabled={updatingId === selected.id} style={{ ...btnGreen, fontSize: 12 }}>✅</button>
              </div>
            </div>

            {/* Progreso */}
            {(selected.pideArticulos || selected.pideLibros || selected.pideDirector) && (
              <div style={{ background: "#0f172a", padding: 20, borderRadius: 12, marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16, fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>📊 Progreso de Producción</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {selected.pideArticulos && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ color: "white", fontWeight: "bold" }}>📝 Artículos</span>
                        <ProgresoControles actual={selected.articulosHechos} total={selected.cantArticulos}
                          onMas={() => subirProgreso("articulosHechos", selected.articulosHechos, selected.cantArticulos)}
                          onMenos={() => bajarProgreso("articulosHechos", selected.articulosHechos)}
                        />
                      </div>
                      <BarraProgreso actual={selected.articulosHechos} total={selected.cantArticulos} color="#60a5fa" />
                    </div>
                  )}
                  {selected.pideLibros && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ color: "white", fontWeight: "bold" }}>📚 Libros</span>
                        <ProgresoControles actual={selected.librosHechos} total={selected.cantLibros}
                          onMas={() => subirProgreso("librosHechos", selected.librosHechos, selected.cantLibros)}
                          onMenos={() => bajarProgreso("librosHechos", selected.librosHechos)}
                        />
                      </div>
                      <BarraProgreso actual={selected.librosHechos} total={selected.cantLibros} color="#22c55e" />
                    </div>
                  )}
                  {selected.pideDirector && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ color: "white", fontWeight: "bold" }}>📘 Ediciones como Director</span>
                        <ProgresoControles actual={selected.edicionesHechas} total={999}
                          onMas={() => subirProgreso("edicionesHechas", selected.edicionesHechas, 999)}
                          onMenos={() => bajarProgreso("edicionesHechas", selected.edicionesHechas)}
                          label={`Edición ${selected.edicionesHechas}`}
                        />
                      </div>
                      <p style={{ color: "#64748b", fontSize: 12 }}>Edición actual: {selected.edicionesHechas === 0 ? "Sin iniciar" : `Edición ${selected.edicionesHechas}`}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Link formulario */}
            <div style={{ background: "#0f172a", padding: 16, borderRadius: 10, marginBottom: 24 }}>
              <p style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>LINK DEL FORMULARIO</p>
              <code style={{ color: "#60a5fa", fontSize: isMobile ? 11 : 13, wordBreak: "break-all" }}>{window.location.origin}/formulario/{selected.token}</code>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={() => copyLink(selected)} style={{ ...btnBlue, fontSize: 12 }}>{copiedId === selected.id ? "✅ Copiado" : "📋 Copiar"}</button>
                <button onClick={() => regenerar(selected.id)} disabled={regeneratingId === selected.id} style={{ ...btnGray, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  {regeneratingId === selected.id ? <Spinner /> : "🔄 Regenerar"}
                </button>
              </div>
              <p style={{ color: isExpired(selected.expiresAt) ? "#ef4444" : "#64748b", fontSize: 12, marginTop: 8 }}>
                {isExpired(selected.expiresAt) ? "⚠️ Link expirado" : `⏳ Expira en ${getDaysLeft(selected.expiresAt)} día(s)`}
              </p>
            </div>

            {/* Fotos */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              {selected.fotografia && (
                <div style={{ background: "#0f172a", padding: 14, borderRadius: 8, textAlign: "center" }}>
                  <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>Foto Personal</p>
                  <img src={selected.fotografia} alt="foto" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: "50%", border: "3px solid #3b82f6", cursor: "pointer" }} onClick={() => window.open(selected.fotografia!, "_blank")} />
                </div>
              )}
              {selected.fotoCarnet && (
                <div style={{ background: "#0f172a", padding: 14, borderRadius: 8, textAlign: "center" }}>
                  <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>Carnet (Frente)</p>
                  <img src={selected.fotoCarnet} alt="carnet" style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 8, border: "3px solid #64748b", cursor: "pointer" }} onClick={() => window.open(selected.fotoCarnet!, "_blank")} />
                  <p style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>Click para ver completo</p>
                </div>
              )}
              {(selected as any).fotoCarnet2 && (
                <div style={{ background: "#0f172a", padding: 14, borderRadius: 8, textAlign: "center" }}>
                  <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>Carnet (Reverso)</p>
                  <img src={(selected as any).fotoCarnet2} alt="carnet2" style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 8, border: "3px solid #64748b", cursor: "pointer" }} onClick={() => window.open((selected as any).fotoCarnet2!, "_blank")} />
                  <p style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>Click para ver completo</p>
                </div>
              )}
            </div>

            {/* Credenciales */}
            <div style={{ background: "#0f172a", padding: 20, borderRadius: 12, marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16, color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>🔐 Credenciales del Cliente</h3>
              {credenciales ? (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
                  <div style={{ background: "#1e293b", padding: 14, borderRadius: 8 }}>
                    <p style={{ color: "#64748b", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>👤 Usuario</p>
                    <p style={{ color: "white", fontSize: 14, fontWeight: "bold" }}>{credenciales.clientUsername || "—"}</p>
                  </div>
                  <div style={{ background: "#1e293b", padding: 14, borderRadius: 8 }}>
                    <p style={{ color: "#64748b", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>🔑 Contraseña</p>
                    {credenciales.clientPassword ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ color: "white", fontSize: 14, fontWeight: "bold", margin: 0 }}>{mostrarPassword ? credenciales.clientPassword : "••••••••"}</p>
                        <button onClick={() => setMostrarPassword(!mostrarPassword)} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 14 }}>{mostrarPassword ? "🙈" : "👁️"}</button>
                      </div>
                    ) : (
                      <p style={{ color: "#64748b", fontSize: 13 }}>Usa el botón "Regenerar credenciales" para obtener una nueva.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>Este cliente aún no tiene credenciales de acceso. Haz clic en el botón para generarlas.</p>
              )}
              <button onClick={() => regenerarCredenciales(selected.id)} style={{ marginTop: 16, background: "#7c3aed", border: "none", padding: "10px 20px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>🔄 Regenerar credenciales</button>
              {credenciales?.clientPassword && <div style={{ background: "#1e3a5f", color: "#60a5fa", padding: 10, borderRadius: 8, marginTop: 12, fontSize: 13 }}>⚠️ Comparte esta contraseña con el cliente por un canal seguro. Al recargar la página no volverá a verse.</div>}
            </div>

            {/* Datos personales */}
            <h3 style={{ marginBottom: 16, color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Datos Personales</h3>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "C.I.", value: selected.ci },
                { label: "Nombres", value: selected.nombres },
                { label: "Apellido Paterno", value: selected.apellidoPaterno },
                { label: "Apellido Materno", value: selected.apellidoMaterno },
                { label: "Sexo", value: selected.sexo },
                { label: "Ciudad", value: selected.ciudad },
                { label: "Extensión", value: selected.extension },
                { label: "Dirección", value: selected.direccion },
                { label: "Fecha Nacimiento", value: selected.fechaNacimiento },
                { label: "Profesión", value: selected.profesion },
                { label: "Celular", value: selected.celular },
                { label: "Email", value: selected.email },
              ].map(item => (
                <div key={item.label} style={{ background: "#0f172a", padding: 14, borderRadius: 8 }}>
                  <p style={{ color: "#64748b", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>{item.label}</p>
                  <p style={{ color: item.value ? "white" : "#334155", fontSize: 14 }}>{item.value || "No proporcionado"}</p>
                </div>
              ))}
            </div>

            {/* Servicios */}
            <h3 style={{ marginBottom: 12, color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Servicios</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              {selected.pideLibros && <span style={tagStyle}>📚 Libros ({selected.cantLibros})</span>}
              {selected.pideArticulos && <span style={tagStyle}>📝 Artículos ({selected.cantArticulos})</span>}
              {selected.pideDirector && <span style={tagStyle}>📘 Director</span>}
              {selected.pideFundador && <span style={tagStyle}>🏆 Fundador</span>}
              {!selected.pideLibros && !selected.pideArticulos && !selected.pideDirector && !selected.pideFundador && <p style={{ color: "#64748b", fontSize: 14 }}>Sin servicios aún.</p>}
            </div>

            {selected.notasServicio && (
              <div style={{ background: "#0f172a", padding: 14, borderRadius: 8, marginBottom: 16 }}>
                <p style={{ color: "#64748b", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>Notas</p>
                <p style={{ color: "white", fontSize: 14 }}>{selected.notasServicio}</p>
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <button onClick={() => copiarSenapi(selected)} style={{ ...btnGreen, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>📋 Copiar SENAPI</button>
              <button onClick={() => remove(selected)} disabled={deletingId === selected.id} style={{ ...btnRed, display: "flex", alignItems: "center", gap: 8 }}>{deletingId === selected.id ? <Spinner /> : "🗑 Eliminar cliente"}</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Crear cliente */}
          <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, marginBottom: 24, display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, alignItems: isMobile ? "stretch" : "center" }}>
            <input placeholder="Nombre del cliente (opcional)" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#334155", color: "white", fontSize: 14 }} />
            <button onClick={create} disabled={creating} style={{ ...btnBlue, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>{creating ? <Spinner /> : "➕ Nuevo cliente"}</button>
          </div>

          <NavegadorMes mesLabel={mesLabel} anio={anio} onAnterior={anterior} onSiguiente={siguiente} esActual={esActual()} />

          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            <button onClick={() => setView("lista")} style={view === "lista" ? btnBlue : btnGray}>📋 Lista</button>
            <button onClick={() => setView("reporte")} style={view === "reporte" ? btnBlue : btnGray}>📊 Reporte</button>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}><Spinner /></div>
          ) : clientesMes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}><p style={{ color: "#64748b", fontSize: 16 }}>No hay clientes en {mesLabel} {anio}</p></div>
          ) : view === "lista" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {clientesMes.map(c => {
                const expired = isExpired(c.expiresAt);
                const statusColors = getStatusColor(c.status);
                return (
                  <div key={c.id} style={{ background: "#1e293b", padding: isMobile ? "14px 16px" : "16px 20px", borderRadius: 10, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", borderLeft: `4px solid ${expired ? "#ef4444" : "#3b82f6"}`, gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "white", fontWeight: "bold", marginBottom: 4, fontSize: isMobile ? 14 : 15 }}>{getNombreDisplay(c)}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: statusColors.bg, color: statusColors.color }}>{c.status}</span>
                        <span style={{ fontSize: 11, color: expired ? "#ef4444" : "#64748b" }}>{expired ? "⚠️ Expirado" : `⏳ ${getDaysLeft(c.expiresAt)} día(s)`}</span>
                      </div>
                      {(c.pideArticulos || c.pideLibros || c.pideDirector) && (
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {c.pideArticulos && <span style={{ fontSize: 12, color: "#60a5fa" }}>📝 {c.articulosHechos}/{c.cantArticulos}</span>}
                          {c.pideLibros && <span style={{ fontSize: 12, color: "#22c55e" }}>📚 {c.librosHechos}/{c.cantLibros}</span>}
                          {c.pideDirector && <span style={{ fontSize: 12, color: "#a78bfa" }}>📘 Ed.{c.edicionesHechas}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => copyLink(c)} style={{ ...btnGray, fontSize: 12 }}>{copiedId === c.id ? "✅" : "📋"}</button>
                      <button onClick={() => setSelected(c)} style={{ ...btnBlue, fontSize: 12 }}>Ver</button>
                      <button onClick={() => remove(c)} disabled={deletingId === c.id} style={{ ...btnRed, fontSize: 12, display: "flex", alignItems: "center", gap: 6, minWidth: 44, justifyContent: "center" }}>{deletingId === c.id ? <Spinner /> : "🗑"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button onClick={() => exportPDF(clientesMes, `${mesLabel} ${anio}`)} style={{ ...btnGray, fontSize: 13 }}>🖨️ Exportar PDF</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#1e293b" }}>
                      {["Nombre", "C.I.", "Ext.", "Email", "Celular", "Profesión", "Servicios", "Progreso", "Estado", "SENAPI"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: "bold", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientesMes.map((c, i) => {
                      const statusColors = getStatusColor(c.status);
                      return (
                        <tr key={c.id} onClick={() => setSelected(c)} style={{ background: i % 2 === 0 ? "#0f172a" : "#1e293b", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "#334155")} onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#0f172a" : "#1e293b")}>
                          <td style={tdStyle}><strong>{getNombreDisplay(c)}</strong></td>
                          <td style={tdStyle}>{c.ci || "—"}</td>
                          <td style={tdStyle}>{c.extension || "—"}</td>
                          <td style={tdStyle}>{c.email || "—"}</td>
                          <td style={tdStyle}>{c.celular || "—"}</td>
                          <td style={tdStyle}>{c.profesion || "—"}</td>
                          <td style={tdStyle}><span style={{ color: "#60a5fa" }}>{getServicios(c)}</span></td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {c.pideArticulos && <span style={{ fontSize: 11, color: "#60a5fa" }}>📝 {c.articulosHechos}/{c.cantArticulos}</span>}
                              {c.pideLibros && <span style={{ fontSize: 11, color: "#22c55e" }}>📚 {c.librosHechos}/{c.cantLibros}</span>}
                              {c.pideDirector && <span style={{ fontSize: 11, color: "#a78bfa" }}>📘 Ed.{c.edicionesHechas}</span>}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: statusColors.bg, color: statusColors.color, fontWeight: "bold", whiteSpace: "nowrap" }}>{c.status}</span>
                          </td>
                          <td style={tdStyle}>
                            <button onClick={e => { e.stopPropagation(); copiarSenapi(c); }} style={{ padding: "6px 10px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>Copiar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Controles de progreso ────────────────────────────────────────────────
function ProgresoControles({ actual, total, onMas, onMenos, label }: { actual: number; total: number; onMas: () => void; onMenos: () => void; label?: string; }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={onMenos} disabled={actual <= 0} style={{ background: "#334155", border: "none", borderRadius: 6, color: "white", cursor: actual <= 0 ? "not-allowed" : "pointer", width: 28, height: 28, fontSize: 16, opacity: actual <= 0 ? 0.4 : 1 }}>−</button>
      <span style={{ color: "white", fontWeight: "bold", minWidth: 52, textAlign: "center" }}>{label ?? `${actual}/${total}`}</span>
      <button onClick={onMas} disabled={actual >= total} style={{ background: "#22c55e", border: "none", borderRadius: 6, color: "white", cursor: actual >= total ? "not-allowed" : "pointer", width: 28, height: 28, fontSize: 16, opacity: actual >= total ? 0.4 : 1 }}>+</button>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const tdStyle: React.CSSProperties = { padding: "12px 14px", color: "white", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap" };
const tagStyle: React.CSSProperties = { background: "#1e3a5f", color: "#60a5fa", padding: "4px 14px", borderRadius: 99, fontSize: 13, fontWeight: "bold" };
const btnBlue: React.CSSProperties = { background: "#3b82f6", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGreen: React.CSSProperties = { background: "#22c55e", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnRed: React.CSSProperties = { background: "#ef4444", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnPurple: React.CSSProperties = { background: "#7c3aed", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };

export default Clients;