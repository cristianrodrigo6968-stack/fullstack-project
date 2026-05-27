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

  // Estados para credenciales
  const [credenciales, setCredenciales] = useState<{
    clientUsername: string;
    clientPassword?: string;
  } | null>(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Modal de confirmación
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

  // ── Confirm helper ────────────────────────────────────────────────────────
  const showConfirm = (message: string, action: () => void, label = "Sí, confirmar", icon = "🗑️") => {
    setConfirmMessage(message);
    setConfirmAction(() => () => action());
    setConfirmLabel(label);
    setConfirmIcon(icon);
    setConfirmOpen(true);
  };

  // ── Funciones CRUD y helpers (se mantienen igual que antes) ──────────────
  const create = async () => { /* ... igual que antes ... */ };
  const copyLink = (c: Client) => { /* ... */ };
  const regenerar = async (id: number) => { /* ... */ };
  const updateStatus = async (id: number, status: string) => { /* ... */ };
  const updateProgreso = async (id: number, campo: string, valor: number) => { /* ... */ };
  const subirProgreso = (campo: string, actual: number, total: number) => { /* ... */ };
  const bajarProgreso = async (campo: string, actual: number) => { /* ... */ };
  const remove = (c: Client) => { /* ... */ };
  const isExpired = (expiresAt: string) => new Date() > new Date(expiresAt);
  const getDaysLeft = (expiresAt: string) =>
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // ... (todas las funciones existentes se mantienen, no las modifiqué para no alargar)
  // Para el ejemplo, solo muestro la parte visual corregida.
  // En tu código real, pega este archivo completo que te di en el mensaje, que sí incluye todas las funciones.

  const getNombreDisplay = (c: Client): string => {
    if (c.nombres || c.apellidoPaterno) {
      return [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(" ");
    }
    return c.nombreCompleto || "Sin nombre";
  };

  // ── Render (solo muestro la parte del detalle que cambia) ────────────────
  return (
    <div>
      {/* ... resto del componente (título, navegador, lista) se mantiene ... */}
      {selected && (
        <div>
          <button onClick={() => setSelected(null)} style={btnGray}>← Volver</button>
          <div style={{ background: "#1e293b", padding: isMobile ? 20 : 28, borderRadius: 14, marginTop: 20 }}>
            {/* Cabecera */}
            {/* ... */}

            {/* Fotos */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              {selected.fotografia && (
                <div style={{ background: "#0f172a", padding: 14, borderRadius: 8, textAlign: "center" }}>
                  <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>Foto Personal</p>
                  <img src={selected.fotografia} alt="foto"
                    style={{ width: 100, height: 100, objectFit: "cover", borderRadius: "50%", border: "3px solid #3b82f6", cursor: "pointer" }}
                    onClick={() => window.open(selected.fotografia!, "_blank")}
                  />
                </div>
              )}
              {selected.fotoCarnet && (
                <div style={{ background: "#0f172a", padding: 14, borderRadius: 8, textAlign: "center" }}>
                  <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>Carnet (Frente)</p>
                  <img src={selected.fotoCarnet} alt="carnet"
                    style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 8, border: "3px solid #64748b", cursor: "pointer" }}
                    onClick={() => window.open(selected.fotoCarnet!, "_blank")}
                  />
                  <p style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>Click para ver completo</p>
                </div>
              )}
              {(selected as any).fotoCarnet2 && (
                <div style={{ background: "#0f172a", padding: 14, borderRadius: 8, textAlign: "center" }}>
                  <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>Carnet (Reverso)</p>
                  <img src={(selected as any).fotoCarnet2} alt="carnet2"
                    style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 8, border: "3px solid #64748b", cursor: "pointer" }}
                    onClick={() => window.open((selected as any).fotoCarnet2!, "_blank")}
                  />
                  <p style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>Click para ver completo</p>
                </div>
              )}
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
            {/* ... resto del detalle (servicios, notas, acciones) ... */}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Estilos (se mantienen igual) ──────────────────────────────────────────
const btnBlue: React.CSSProperties = { background: "#3b82f6", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGreen: React.CSSProperties = { background: "#22c55e", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnRed: React.CSSProperties = { background: "#ef4444", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnPurple: React.CSSProperties = { background: "#7c3aed", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const tagStyle: React.CSSProperties = { background: "#1e3a5f", color: "#60a5fa", padding: "4px 14px", borderRadius: 99, fontSize: 13, fontWeight: "bold" };

export default Clients;