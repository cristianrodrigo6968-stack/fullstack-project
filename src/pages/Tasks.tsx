import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";
import { useMesActual } from "../hooks/useMesActual";
import NavegadorMes from "../components/NavegadorMes";

const API_URL = "https://taskmanager-backend-ewud.onrender.com";

interface Task {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface ClienteTask {
  id: number;
  tipo: string;
  descripcion: string;
  completada: boolean;
  createdAt: string;
  cliente: { id: number; nombreCompleto: string | null };
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

function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "Sí", icon = "✅" }: {
  message: string; onConfirm: () => void; onCancel: () => void;
  confirmLabel?: string; icon?: string;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 9999, padding: "0 20px",
    }}>
      <div style={{
        background: "#1e293b", padding: 32, borderRadius: 16,
        width: "100%", maxWidth: 360, color: "white",
        textAlign: "center", border: "1px solid #334155",
      }}>
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

function getTipoIcon(tipo: string) {
  if (tipo === "edicion_revista") return "📘";
  if (tipo === "articulo") return "📝";
  if (tipo === "libro") return "📚";
  if (tipo === "fundador") return "🏆";
  return "📋";
}

function Tasks() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const { mes, anio, mesLabel, anterior, siguiente, esActual, filtrarPorMes } = useMesActual();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [clienteTasks, setClienteTasks] = useState<ClienteTask[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmLabel, setConfirmLabel] = useState("Sí");
  const [confirmIcon, setConfirmIcon] = useState("✅");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const load = async () => {
    setLoading(true);
    const [tRes, ctRes] = await Promise.all([
      fetch(`${API_URL}/tasks`, { headers }),
      fetch(`${API_URL}/cliente-tasks`, { headers }),
    ]);
    setTasks(await tRes.json());
    setClienteTasks(await ctRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showConfirm = (message: string, action: () => void, label = "Sí", icon = "✅") => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmLabel(label);
    setConfirmIcon(icon);
    setConfirmOpen(true);
  };

  const add = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await fetch(`${API_URL}/tasks`, { method: "POST", headers, body: JSON.stringify({ title }) });
      setTitle("");
      await load();
    } finally { setAdding(false); }
  };

  const toggle = async (id: number, completed: boolean) => {
    setTogglingId(id);
    try {
      await fetch(`${API_URL}/tasks/${id}`, { method: "PUT", headers, body: JSON.stringify({ completed: !completed }) });
      await load();
    } finally { setTogglingId(null); }
  };

  const openEdit = (task: Task) => { setEditId(task.id); setEditTitle(task.title); setEditOpen(true); };

  const saveEdit = async () => {
    if (!editTitle.trim() || !editId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/tasks/${editId}`, { method: "PUT", headers, body: JSON.stringify({ title: editTitle }) });
      setEditOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  const removeTask = (task: Task) => {
    showConfirm(
      `¿Eliminar la tarea "${task.title}"?`,
      async () => {
        setConfirmOpen(false);
        setDeletingId(task.id);
        try {
          await fetch(`${API_URL}/tasks/${task.id}`, { method: "DELETE", headers });
          await load();
        } finally { setDeletingId(null); }
      },
      "Sí, eliminar", "🗑️"
    );
  };

  const completarClienteTask = (ct: ClienteTask) => {
    showConfirm(
      `¿Confirmas que "${ct.descripcion}" está completado?`,
      async () => {
        setConfirmOpen(false);
        await fetch(`${API_URL}/cliente-tasks/${ct.id}`, { method: "PUT", headers, body: JSON.stringify({ completada: true }) });
        await load();
      },
      "✅ Sí, completado", "✅"
    );
  };

  const descompletarClienteTask = async (ct: ClienteTask) => {
    await fetch(`${API_URL}/cliente-tasks/${ct.id}`, { method: "PUT", headers, body: JSON.stringify({ completada: false }) });
    await load();
  };

  // Filtrar por mes
  const tasksMes = filtrarPorMes(tasks);
  const clienteTasksMes = filtrarPorMes(clienteTasks);

  // Agrupar tareas de clientes por nombre
  const clienteGroups = clienteTasksMes.reduce((acc, ct) => {
    const nombre = ct.cliente?.nombreCompleto || "Sin nombre";
    if (!acc[nombre]) acc[nombre] = [];
    acc[nombre].push(ct);
    return acc;
  }, {} as Record<string, ClienteTask[]>);

  const completed = tasksMes.filter(t => t.completed).length;
  const total = tasksMes.length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div>
      {confirmOpen && (
        <ConfirmModal
          message={confirmMessage} onConfirm={confirmAction}
          onCancel={() => setConfirmOpen(false)}
          confirmLabel={confirmLabel} icon={confirmIcon}
        />
      )}

      {editOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 999, padding: "0 20px",
        }}>
          <div style={{
            background: "#1e293b", padding: 28, borderRadius: 14,
            width: "100%", maxWidth: 420, color: "white",
          }}>
            <h3 style={{ marginBottom: 16 }}>✏️ Editar tarea</h3>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              style={{
                width: "100%", padding: 10, marginBottom: 16,
                borderRadius: 8, border: "none",
                background: "#334155", color: "white",
                fontSize: 14, boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveEdit} disabled={saving} style={{
                ...btnBlue, display: "flex", alignItems: "center",
                gap: 8, minWidth: 110, justifyContent: "center",
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? <Spinner /> : "💾 Guardar"}
              </button>
              <button onClick={() => setEditOpen(false)} style={btnRed}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>✅ Tareas</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Tareas del equipo y trabajo por cliente.
      </p>

      {/* NAVEGADOR MES */}
      <NavegadorMes
        mesLabel={mesLabel} anio={anio}
        onAnterior={anterior} onSiguiente={siguiente}
        esActual={esActual()}
      />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}><Spinner /></div>
      ) : (
        <div>
          {/* TAREAS DE CLIENTES */}
          {Object.keys(clienteGroups).length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ marginBottom: 16, fontSize: isMobile ? 17 : 20, color: "#60a5fa" }}>
                👥 Trabajo por cliente
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 14,
              }}>
                {Object.entries(clienteGroups).map(([nombre, tareas]) => {
                  const completadas = tareas.filter(t => t.completada).length;
                  const pct = Math.round((completadas / tareas.length) * 100);
                  const isSelected = selectedCliente === nombre;

                  return (
                    <div key={nombre}>
                      <div
                        onClick={() => setSelectedCliente(isSelected ? null : nombre)}
                        style={{
                          background: "#1e293b", padding: 18,
                          borderRadius: isSelected ? "12px 12px 0 0" : 12,
                          cursor: "pointer",
                          borderLeft: `4px solid ${pct === 100 ? "#22c55e" : "#3b82f6"}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <h3 style={{ fontSize: isMobile ? 14 : 15, color: "white" }}>{nombre}</h3>
                          <span style={{
                            fontSize: 11, padding: "2px 10px", borderRadius: 99,
                            background: pct === 100 ? "#14532d" : "#1e3a5f",
                            color: pct === 100 ? "#22c55e" : "#60a5fa", fontWeight: "bold",
                          }}>
                            {completadas}/{tareas.length}
                          </span>
                        </div>
                        <div style={{ background: "#334155", borderRadius: 99, height: 6, overflow: "hidden" }}>
                          <div style={{
                            width: `${pct}%`, height: "100%",
                            background: pct === 100 ? "#22c55e" : "#3b82f6",
                            borderRadius: 99, transition: "width 0.3s",
                          }} />
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                          {[...new Set(tareas.map(t => t.tipo))].map(tipo => (
                            <span key={tipo} style={{ fontSize: 16 }}>{getTipoIcon(tipo)}</span>
                          ))}
                        </div>
                        <p style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>
                          {isSelected ? "▲ Ocultar" : "▼ Ver tareas"}
                        </p>
                      </div>

                      {isSelected && (
                        <div style={{
                          background: "#0f172a", borderRadius: "0 0 12px 12px",
                          padding: "8px 12px 12px",
                          border: "1px solid #334155", borderTop: "none",
                        }}>
                          {tareas.map((ct) => (
                            <div key={ct.id} style={{
                              display: "flex",
                              flexDirection: isMobile ? "column" : "row",
                              justifyContent: "space-between",
                              alignItems: isMobile ? "flex-start" : "center",
                              padding: "10px 0",
                              borderBottom: "1px solid #1e293b", gap: 8,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 18 }}>{getTipoIcon(ct.tipo)}</span>
                                <p style={{
                                  color: ct.completada ? "#64748b" : "white",
                                  textDecoration: ct.completada ? "line-through" : "none",
                                  fontSize: isMobile ? 12 : 13,
                                }}>
                                  {ct.descripcion}
                                </p>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                {!ct.completada ? (
                                  <button onClick={() => completarClienteTask(ct)} style={{ ...btnGreen, fontSize: 12, padding: "6px 12px" }}>
                                    ✅ Completar
                                  </button>
                                ) : (
                                  <button onClick={() => descompletarClienteTask(ct)} style={{ ...btnGray, fontSize: 12, padding: "6px 12px" }}>
                                    ↩️ Revertir
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(clienteGroups).length === 0 && tasksMes.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#64748b", fontSize: 16 }}>No hay tareas en {mesLabel} {anio}</p>
            </div>
          )}

          {/* TAREAS MANUALES */}
          <h2 style={{ marginBottom: 16, fontSize: isMobile ? 17 : 20, color: "#94a3b8" }}>
            📋 Tareas del equipo
          </h2>

          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, marginBottom: 24 }}>
            <input
              placeholder="Nueva tarea..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: "none", background: "#1e293b", color: "white", fontSize: 14 }}
            />
            <button onClick={add} disabled={adding} style={{ ...btnBlue, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {adding ? <Spinner /> : "➕ Agregar"}
            </button>
          </div>

          {total > 0 && (
            <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#94a3b8" }}>Progreso</span>
                <span style={{ color: "white", fontWeight: "bold" }}>{progress}%</span>
              </div>
              <div style={{ background: "#334155", borderRadius: 99, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "#22c55e", borderRadius: 99, transition: "width 0.4s ease" }} />
              </div>
              <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>{completed} de {total} completadas</p>
            </div>
          )}

          {tasksMes.length === 0 ? (
            <p style={{ color: "#64748b" }}>No hay tareas del equipo en {mesLabel} {anio}.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasksMes.map((task) => (
                <div key={task.id} style={{
                  background: "#1e293b", padding: isMobile ? "14px 16px" : "16px 20px",
                  borderRadius: 10, display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "flex-start" : "center",
                  justifyContent: "space-between", gap: 12,
                  borderLeft: `4px solid ${task.completed ? "#22c55e" : "#3b82f6"}`,
                }}>
                  <div>
                    <p style={{ color: task.completed ? "#64748b" : "white", textDecoration: task.completed ? "line-through" : "none", fontSize: isMobile ? 14 : 15, marginBottom: 4 }}>
                      {task.title}
                    </p>
                    <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 99, background: task.completed ? "#14532d" : "#1e3a5f", color: task.completed ? "#22c55e" : "#60a5fa" }}>
                      {task.completed ? "Completada" : "Pendiente"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => toggle(task.id, task.completed)} disabled={togglingId === task.id} style={{ ...task.completed ? btnGray : btnGreen, display: "flex", alignItems: "center", gap: 6, fontSize: 13, minWidth: 100, justifyContent: "center" }}>
                      {togglingId === task.id ? <Spinner /> : task.completed ? "Desmarcar" : "Completar"}
                    </button>
                    <button onClick={() => openEdit(task)} style={{ ...btnYellow, fontSize: 13 }}>✏️</button>
                    <button onClick={() => removeTask(task)} disabled={deletingId === task.id} style={{ ...btnRed, fontSize: 13, display: "flex", alignItems: "center", gap: 6, minWidth: 44, justifyContent: "center" }}>
                      {deletingId === task.id ? <Spinner /> : "🗑"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const btnBlue: React.CSSProperties = { background: "#3b82f6", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGreen: React.CSSProperties = { background: "#22c55e", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnRed: React.CSSProperties = { background: "#ef4444", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnYellow: React.CSSProperties = { background: "#f59e0b", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };

export default Tasks;