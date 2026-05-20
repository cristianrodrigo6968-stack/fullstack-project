import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";
import { useMesActual } from "../hooks/useMesActual";
import NavegadorMes from "../components/NavegadorMes";


const API_URL = import.meta.env.VITE_API_URL;
interface ClienteTask {
  id: number;
  tipo: string;
  descripcion: string;
  completada: boolean;
}

interface Cliente {
  id: number;
  nombreCompleto: string | null;
  clienteTasks: ClienteTask[];
}

interface Entrega {
  id: number;
  estado: string;
  fechaEntrega: string | null;
  createdAt: string;
  cliente: Cliente | null;
}

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

function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 9999, padding: "0 20px",
    }}>
      <div style={{
        background: "#1e293b", padding: 32, borderRadius: 16,
        width: "100%", maxWidth: 380, color: "white",
        textAlign: "center", border: "1px solid #334155",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
        <h3 style={{ marginBottom: 10 }}>¿Confirmar entrega?</h3>
        <p style={{ color: "#94a3b8", marginBottom: 28, fontSize: 14 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={btnGray}>Cancelar</button>
          <button onClick={onConfirm} style={btnGreen}>✅ Sí, entregado</button>
        </div>
      </div>
    </div>
  );
}

function getTipoIcon(tipo: string) {
  if (tipo === "edicion_revista") return "📘";
  if (tipo === "articulo") return "📝";
  if (tipo === "libro") return "📚";
  if (tipo === "fundador") return "🏆";
  return "📋";
}

function Entregas() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const { mes, anio, mesLabel, anterior, siguiente, esActual, filtrarPorMes } = useMesActual();
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/entregas`, { headers });
    setEntregas(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showConfirm = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const marcarEntregado = (e: Entrega) => {
    showConfirm(
      `¿Confirmas que entregaste todo el trabajo a ${e.cliente?.nombreCompleto || "este cliente"}?`,
      async () => {
        setConfirmOpen(false);
        await fetch(`${API_URL}/entregas/${e.id}`, {
          method: "PUT", headers,
          body: JSON.stringify({ estado: "entregado" }),
        });
        await load();
      }
    );
  };

  const marcarPendiente = async (id: number) => {
    await fetch(`${API_URL}/entregas/${id}`, {
      method: "PUT", headers,
      body: JSON.stringify({ estado: "pendiente" }),
    });
    await load();
  };

  const entregasMes = filtrarPorMes(entregas);
  const pendientes = entregasMes.filter(e => e.estado === "pendiente");
  const entregados = entregasMes.filter(e => e.estado === "entregado");

  const EntregaCard = ({ e }: { e: Entrega }) => {
    const isSelected = selectedId === e.id;
    const tareas = e.cliente?.clienteTasks || [];
    const completadas = tareas.filter(t => t.completada).length;
    const pct = tareas.length === 0 ? 0 : Math.round((completadas / tareas.length) * 100);
    const listo = pct === 100;

    return (
      <div style={{ marginBottom: 12 }}>
        <div
          onClick={() => setSelectedId(isSelected ? null : e.id)}
          style={{
            background: "#1e293b", padding: isMobile ? 16 : 20,
            borderRadius: isSelected ? "12px 12px 0 0" : 12,
            cursor: "pointer",
            borderLeft: `4px solid ${e.estado === "entregado" ? "#22c55e" : listo ? "#f59e0b" : "#3b82f6"}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ color: "white", fontSize: isMobile ? 15 : 17, marginBottom: 4 }}>
                👤 {e.cliente?.nombreCompleto || "Sin nombre"}
              </h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {e.estado === "entregado" ? (
                  <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: "#14532d", color: "#22c55e", fontWeight: "bold" }}>
                    ✅ Entregado el {e.fechaEntrega ? new Date(e.fechaEntrega).toLocaleDateString() : ""}
                  </span>
                ) : listo ? (
                  <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: "#422006", color: "#f59e0b", fontWeight: "bold" }}>
                    ⚠️ Listo para entregar
                  </span>
                ) : (
                  <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: "#1e3a5f", color: "#60a5fa", fontWeight: "bold" }}>
                    🔄 En producción ({pct}%)
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {e.estado === "pendiente" && listo && (
                <button
                  onClick={(ev) => { ev.stopPropagation(); marcarEntregado(e); }}
                  style={{ ...btnGreen, fontSize: 13 }}
                >
                  📦 Entregar
                </button>
              )}
              {e.estado === "entregado" && (
                <button
                  onClick={(ev) => { ev.stopPropagation(); marcarPendiente(e.id); }}
                  style={{ ...btnGray, fontSize: 13 }}
                >
                  ↩️ Revertir
                </button>
              )}
              <span style={{ color: "#64748b", fontSize: 18 }}>{isSelected ? "▲" : "▼"}</span>
            </div>
          </div>

          {tareas.length > 0 && e.estado === "pendiente" && (
            <div style={{ marginTop: 12 }}>
              <div style={{ background: "#334155", borderRadius: 99, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: listo ? "#f59e0b" : "#3b82f6", borderRadius: 99, transition: "width 0.3s" }} />
              </div>
              <p style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{completadas}/{tareas.length} tareas completadas</p>
            </div>
          )}
        </div>

        {isSelected && (
          <div style={{ background: "#0f172a", padding: 16, borderRadius: "0 0 12px 12px", border: "1px solid #334155", borderTop: "none" }}>
            <p style={{ color: "#64748b", fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              Trabajo a entregar
            </p>
            {tareas.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 13 }}>No hay tareas registradas.</p>
            ) : (
              tareas.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                  <span style={{ fontSize: 18 }}>{getTipoIcon(t.tipo)}</span>
                  <p style={{ flex: 1, color: t.completada ? "#64748b" : "white", textDecoration: t.completada ? "line-through" : "none", fontSize: isMobile ? 12 : 13 }}>
                    {t.descripcion}
                  </p>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: t.completada ? "#14532d" : "#1e3a5f", color: t.completada ? "#22c55e" : "#60a5fa" }}>
                    {t.completada ? "✅ Listo" : "⏳ Pendiente"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {confirmOpen && (
        <ConfirmModal
          message={confirmMessage}
          onConfirm={confirmAction}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>📦 Entregas</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Confirma las entregas a los clientes cuando el trabajo esté listo.
      </p>

      {/* NAVEGADOR MES */}
      <NavegadorMes
        mesLabel={mesLabel} anio={anio}
        onAnterior={anterior} onSiguiente={siguiente}
        esActual={esActual()}
      />

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total", value: entregasMes.length, color: "#3b82f6" },
          { label: "Pendientes", value: pendientes.length, color: "#f59e0b" },
          { label: "Entregados", value: entregados.length, color: "#22c55e" },
        ].map(s => (
          <div key={s.label} style={{ background: "#1e293b", padding: isMobile ? 12 : 16, borderRadius: 12, textAlign: "center", borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: s.color }}>{s.value}</div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}><Spinner /></div>
      ) : entregasMes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#64748b", fontSize: 16 }}>No hay entregas en {mesLabel} {anio}</p>
        </div>
      ) : (
        <div>
          {pendientes.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: "#f59e0b", marginBottom: 16, fontSize: isMobile ? 15 : 17 }}>
                ⏳ Pendientes ({pendientes.length})
              </h3>
              {pendientes.map(e => <EntregaCard key={e.id} e={e} />)}
            </div>
          )}
          {entregados.length > 0 && (
            <div>
              <h3 style={{ color: "#22c55e", marginBottom: 16, fontSize: isMobile ? 15 : 17 }}>
                ✅ Entregados ({entregados.length})
              </h3>
              {entregados.map(e => <EntregaCard key={e.id} e={e} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const btnGreen: React.CSSProperties = { background: "#22c55e", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };

export default Entregas;