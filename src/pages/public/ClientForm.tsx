import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useWindowSize } from "../../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          display: "inline-block",
          width: 20,
          height: 20,
          border: "3px solid rgba(255,255,255,0.3)",
          borderTop: "3px solid white",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </>
  );
}

const EXTENSIONES = ["LP", "CB", "SC", "OR", "PT", "CH", "TJ", "BN", "PD", "QR"] as const;
type Extension = (typeof EXTENSIONES)[number];

const SEXOS = ["Masculino", "Femenino"] as const;
type Sexo = (typeof SEXOS)[number];

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type Screen = "form" | "review" | "success";

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

function soloLetrasMayusculas(value: string): string {
  return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").toUpperCase();
}

function ClientForm() {
  const { token } = useParams();
  const { isMobile } = useWindowSize();

  const [screen, setScreen] = useState<Screen>("form");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [daysLeft, setDaysLeft] = useState(0);
  const [subiendoFotos, setSubiendoFotos] = useState(false);

  const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    ci: useRef<HTMLDivElement>(null),
    nombres: useRef<HTMLDivElement>(null),
    apellidoPaterno: useRef<HTMLDivElement>(null),
    apellidoMaterno: useRef<HTMLDivElement>(null),
    sexo: useRef<HTMLDivElement>(null),
    ciudad: useRef<HTMLDivElement>(null),
    direccion: useRef<HTMLDivElement>(null),
    fechaNacimiento: useRef<HTMLDivElement>(null),
    extension: useRef<HTMLDivElement>(null),
    profesion: useRef<HTMLDivElement>(null),
    celular: useRef<HTMLDivElement>(null),
    email: useRef<HTMLDivElement>(null),
    fotografia: useRef<HTMLDivElement>(null),
    fotoCarnet: useRef<HTMLDivElement>(null),
  };

  const [ci, setCi] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [sexo, setSexo] = useState<Sexo | "">("");
  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [extension, setExtension] = useState<Extension | "">("");
  const [profesion, setProfesion] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");

  const [fotografia, setFotografia] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>("");
  const [fotoCarnet, setFotoCarnet] = useState<File | null>(null);
  const [carnetPreview, setCarnetPreview] = useState<string>("");
  const [carnetEsImagen, setCarnetEsImagen] = useState(true);
  const [fotoCarnet2, setFotoCarnet2] = useState<File | null>(null);
  const [carnetPreview2, setCarnetPreview2] = useState<string>("");

  const [credenciales, setCredenciales] = useState<{ username: string; password: string } | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clients/form/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.error || "Link no válido");
        return;
      }
      const expires = new Date(data.expiresAt);
      const diff = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      setDaysLeft(diff);
      setCi(data.ci || "");
      setNombres(data.nombres || "");
      setApellidoPaterno(data.apellidoPaterno || "");
      setApellidoMaterno(data.apellidoMaterno || "");
      setSexo(data.sexo || "");
      setCiudad(data.ciudad || "");
      setDireccion(data.direccion || "");
      setFechaNacimiento(data.fechaNacimiento || "");
      setExtension(data.extension || "");
      setProfesion(data.profesion || "");
      setCelular(data.celular || "");
      setEmail(data.email || "");
      if (data.fotografia) setFotoPreview(data.fotografia);
      if (data.fotoCarnet) setCarnetPreview(data.fotoCarnet);
    } catch {
      setLinkError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const esImagen = (file: File) => file.type.startsWith("image/");
  const esPDF = (file: File) =>
  file.type === "application/pdf" ||
  file.type === "application/msword" ||
  file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
  /\.(pdf|docx?|DOC|DOCX)$/.test(file.name);

  const validarTamano = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`El archivo "${file.name}" es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). El máximo permitido es ${MAX_FILE_SIZE_MB} MB.`);
      return false;
    }
    return true;
  };

  const handleCarnet1 = (file: File) => {
    if (!validarTamano(file)) return;
    if (esImagen(file)) {
      setFotoCarnet(file);
      setCarnetPreview(URL.createObjectURL(file));
      setCarnetEsImagen(true);
    } else if (esPDF(file)) {
      setFotoCarnet(file);
      setCarnetPreview(file.name);
      setCarnetEsImagen(false);
      setFotoCarnet2(null);
      setCarnetPreview2("");
    } else {
      alert("Solo se permiten imágenes (JPG, PNG) o archivos PDF.");
    }
  };

  const handleCarnet2 = (file: File) => {
    if (!validarTamano(file)) return;
    if (esImagen(file)) {
      setFotoCarnet2(file);
      setCarnetPreview2(URL.createObjectURL(file));
    } else {
      alert("El reverso solo puede ser una imagen (JPG o PNG).");
    }
  };

  const irARevisar = () => {
    const e: Record<string, string> = {};
    if (!ci.trim()) e.ci = "La cédula es obligatoria";
    else if (!/^\d+$/.test(ci.trim())) e.ci = "Solo puede contener números";
    if (!nombres.trim()) e.nombres = "Los nombres son obligatorios";
    else if (/\d/.test(nombres)) e.nombres = "No puede contener números";
    if (!apellidoPaterno.trim()) e.apellidoPaterno = "El apellido paterno es obligatorio";
    else if (/\d/.test(apellidoPaterno)) e.apellidoPaterno = "No puede contener números";
    if (apellidoMaterno && /\d/.test(apellidoMaterno)) e.apellidoMaterno = "No puede contener números";
    if (!sexo) e.sexo = "Seleccione un sexo";
    if (!ciudad.trim()) e.ciudad = "La ciudad es obligatoria";
    if (!direccion.trim()) e.direccion = "La dirección es obligatoria";
    if (!fechaNacimiento) e.fechaNacimiento = "La fecha de nacimiento es obligatoria";
    if (!extension) e.extension = "Selecciona un departamento";
    if (!profesion.trim()) e.profesion = "La profesión es obligatoria";
    else if (/\d/.test(profesion)) e.profesion = "No puede contener números";
    if (!celular.trim()) e.celular = "El celular es obligatorio";
    else if (!/^\d+$/.test(celular.trim())) e.celular = "Solo puede contener números";
    if (!email.trim()) e.email = "El email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Email no válido";
    if (!fotografia && !fotoPreview) e.fotografia = "La foto personal es obligatoria";
    if (!fotoCarnet && !carnetPreview) e.fotoCarnet = "El documento/foto del carnet es obligatorio";
    setErrors(e);
    const orden = ["ci","nombres","apellidoPaterno","apellidoMaterno","sexo","ciudad","direccion","fechaNacimiento","extension","profesion","celular","email","fotografia","fotoCarnet"];
    const primerError = orden.find(k => e[k]);
    if (primerError && refs[primerError]?.current) {
      setTimeout(() => refs[primerError].current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setScreen("review"), 100);
  };

  const confirmarYGuardar = async () => {
    setSaving(true);
    setSaveError("");
    setSubiendoFotos(true);
    try {
      const formData = new FormData();
      if (fotografia) formData.append("fotografia", fotografia);
      if (fotoCarnet) formData.append("fotoCarnet", fotoCarnet);
      if (fotoCarnet2) formData.append("fotoCarnet2", fotoCarnet2);

      let fotosOk = true;
      if (formData.has("fotografia") || formData.has("fotoCarnet") || formData.has("fotoCarnet2")) {
        const fotosRes = await fetch(`${API_URL}/clients/form/${token}/fotos`, { method: "POST", body: formData });
        if (!fotosRes.ok) {
          const errData = await fotosRes.json();
          const msg = errData.error || "";
          setSaveError(
            fotosRes.status === 413 || msg.toLowerCase().includes("size") || msg.toLowerCase().includes("large")
              ? "El archivo es demasiado grande. Usá una imagen más pequeña o comprimila antes de subir."
              : msg || "Error al subir las imágenes. Intenta de nuevo."
          );
          fotosOk = false;
        }
      }
      if (!fotosOk) { setSaving(false); setSubiendoFotos(false); return; }
      setSubiendoFotos(false);

      const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();
      const res = await fetch(`${API_URL}/clients/form/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ci, nombres, apellidoPaterno, apellidoMaterno, nombreCompleto,
          sexo, ciudad, direccion, fechaNacimiento, extension,
          profesion, celular, email,
          pideLibros: false, cantLibros: 0,
          pideArticulos: false, cantArticulos: 0,
          pideDirector: false, pideFundador: false,
          notasServicio: "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 410) {
          setLinkError(data.error || "Este link ya fue utilizado y no puede volver a enviarse.");
          setScreen("form");
        } else {
          setSaveError(data.error || "Error al guardar los datos personales");
        }
        return;
      }

      const data = await res.json();
      if (data.credentials) setCredenciales(data.credentials);
      if (data.pdfBase64) setPdfBase64(data.pdfBase64);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setScreen("success"), 100);
    } catch (err) {
      console.error("Error en save:", err);
      setSaveError("Error al conectar con el servidor. Revisa tu conexión.");
    } finally {
      setSaving(false);
      setSubiendoFotos(false);
    }
  };

  const ResumenDatos = () => (
    <div style={{ background: "#0f172a", padding: 20, borderRadius: 12 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {fotoPreview && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>FOTO PERSONAL</p>
            <img src={fotoPreview} alt="foto" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "2px solid #334155" }} />
          </div>
        )}
        {carnetPreview && carnetEsImagen && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>CARNET (FRENTE)</p>
            <img src={carnetPreview} alt="carnet" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "2px solid #334155" }} />
          </div>
        )}
        {carnetPreview2 && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>CARNET (REVERSO)</p>
            <img src={carnetPreview2} alt="carnet2" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "2px solid #334155" }} />
          </div>
        )}
        {carnetPreview && !carnetEsImagen && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>DOCUMENTO CARNET</p>
            <div style={{ width: 80, height: 80, background: "#1e293b", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📄</div>
            <p style={{ color: "#60a5fa", fontSize: 10, marginTop: 4, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{carnetPreview}</p>
          </div>
        )}
      </div>
      {[
        { label: "C.I.", value: ci },
        { label: "Nombres", value: nombres },
        { label: "Apellido Paterno", value: apellidoPaterno },
        { label: "Apellido Materno", value: apellidoMaterno },
        { label: "Sexo", value: sexo },
        { label: "Ciudad", value: ciudad },
        { label: "Dirección", value: direccion },
        { label: "Fecha Nacimiento", value: fechaNacimiento },
        { label: "Extensión", value: extension },
        { label: "Profesión", value: profesion },
        { label: "Celular", value: celular },
        { label: "Email", value: email },
      ].filter(item => item.value).map(item => (
        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
          <span style={{ color: "#64748b", fontSize: 13 }}>{item.label}</span>
          <span style={{ color: "white", fontSize: 13, textAlign: "right", maxWidth: "60%" }}>{item.value}</span>
        </div>
      ))}
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#000" }}><Spinner /></div>
  );

  if (linkError) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#000", color: "white", flexDirection: "column", gap: 16, padding: isMobile ? 20 : 40, textAlign: "center", overflowX: "hidden" }}>
      <div style={{ fontSize: 60 }}>⚠️</div>
      <h2 style={{ fontSize: isMobile ? 18 : 22, wordBreak: "break-word" }}>{linkError}</h2>
      <p style={{ color: "#94a3b8", fontSize: isMobile ? 13 : 14 }}>Contacta con la Asociación para obtener un nuevo link.</p>
    </div>
  );

  if (screen === "review") return (
    <div lang="es" translate="no" style={{ background: "#000", minHeight: "100vh", padding: isMobile ? "24px 16px" : "40px 20px", color: "white", overflowX: "hidden" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", padding: isMobile ? 20 : 28, borderRadius: 16, marginBottom: 20, borderLeft: "4px solid #6366f1" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <h2 style={{ marginBottom: 6, fontSize: isMobile ? 19 : 22 }}>Revisá tus datos</h2>
          <p style={{ color: "#94a3b8", fontSize: isMobile ? 13 : 14, margin: 0, wordBreak: "break-word" }}>Verificá que todo esté correcto antes de confirmar. Una vez guardado, el equipo procesará tu registro.</p>
        </div>
        {saveError && <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", padding: 16, borderRadius: 10, marginBottom: 20, color: "#ef4444", fontWeight: "bold", fontSize: 14, wordBreak: "break-word" }}>⚠️ {saveError}</div>}
        <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 14, padding: isMobile ? 16 : 20, marginBottom: 20 }}>
          <p style={{ color: "#64748b", fontSize: 12, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Resumen de tus datos</p>
          <ResumenDatos />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={confirmarYGuardar} disabled={saving} style={{ width: "100%", minHeight: 44, padding: 16, background: saving ? "#334155" : "linear-gradient(135deg,#34d399,#10b981)", border: "none", borderRadius: 12, color: "white", fontSize: 16, fontWeight: "bold", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", textAlign: "center" }}>
            {saving ? (subiendoFotos ? "📤 Subiendo archivos..." : <><Spinner /> Guardando...</>) : "✅ Confirmar y guardar mis datos"}
          </button>
          <button onClick={() => { setSaveError(""); setScreen("form"); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50); }} disabled={saving} style={{ width: "100%", minHeight: 44, padding: 14, background: "transparent", border: "2px solid #1e1b4b", borderRadius: 12, color: "#94a3b8", fontSize: 15, fontWeight: "bold", cursor: saving ? "not-allowed" : "pointer" }}>✏️ Editar mis datos</button>
        </div>
        <p style={{ textAlign: "center", color: "#475569", fontSize: 12, marginTop: 16 }}>Podés volver al formulario y editar cuantas veces necesites.</p>
      </div>
    </div>
  );

  if (screen === "success") return (
    <div lang="es" translate="no" style={{ background: "#000", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: isMobile ? "24px 16px" : "40px 20px", color: "white", overflowX: "hidden" }}>
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        <style>{`@keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } .success-icon { animation: popIn 0.5s ease forwards; display: inline-block; }`}</style>
        <div className="success-icon" style={{ fontSize: isMobile ? 64 : 80, marginBottom: 20 }}>🎉</div>
        <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", padding: isMobile ? 24 : 36, borderRadius: 20, borderTop: "4px solid #34d399" }}>
          <h2 style={{ marginBottom: 20, fontSize: isMobile ? 21 : 26, color: "#34d399", wordBreak: "break-word" }}>¡Datos guardados exitosamente!</h2>
          {credenciales && (
            <div style={{ background: "#0a0a14", borderRadius: 12, padding: isMobile ? "16px 18px" : "20px 24px", marginBottom: 24, textAlign: "left", border: "1px solid #1e1b4b" }}>
              <p style={{ color: "#a5b4fc", fontSize: 14, fontWeight: "bold", marginBottom: 12 }}>🔐 Tus credenciales de acceso</p>
              <div style={{ background: "#0d0d1a", borderRadius: 8, padding: "10px 16px", marginBottom: 8, wordBreak: "break-word" }}><p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}>USUARIO</p><p style={{ color: "white", fontSize: 18, fontWeight: "bold", letterSpacing: 1, wordBreak: "break-word" }}>{credenciales.username}</p></div>
              <div style={{ background: "#0d0d1a", borderRadius: 8, padding: "10px 16px", marginBottom: 12, wordBreak: "break-word" }}><p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}>CONTRASEÑA</p><p style={{ color: "white", fontSize: 18, fontWeight: "bold", letterSpacing: 1, wordBreak: "break-word" }}>{credenciales.password}</p></div>
              <p style={{ color: "#64748b", fontSize: 12 }}>⚠️ Guardá esta información. No se volverá a mostrar.</p>
            </div>
          )}
          {!credenciales && (
            <div style={{ background: "#0a0a14", borderRadius: 12, padding: isMobile ? "16px 18px" : "20px 24px", marginBottom: 24, textAlign: "center", border: "1px solid #1e1b4b" }}>
              <p style={{ color: "#a5b4fc", fontSize: 14, fontWeight: "bold", marginBottom: 12 }}>✅ Ya tienes credenciales activas</p>
              <p style={{ color: "#94a3b8", fontSize: 13 }}>Usa tu usuario y contraseña anteriores para acceder al portal.</p>
            </div>
          )}
          
          <p style={{ color: "#94a3b8", fontSize: isMobile ? 13 : 15, lineHeight: 1.6, marginBottom: 24, wordBreak: "break-word" }}>El equipo revisará tu información y se pondrá en contacto con vos a la brevedad.</p>
          <div style={{ background: "#0a0a14", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontSize: 20 }}>📬</span><p style={{ color: "#a5b4fc", fontSize: 13, margin: 0, textAlign: "left", wordBreak: "break-word" }}>Te contactaremos al número <strong>{celular}</strong> o al correo <strong>{email}</strong>.</p></div>
          <button onClick={() => window.location.href = "/"} style={{ width: "100%", minHeight: 44, padding: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, color: "white", fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>🏠 Volver al inicio</button>
          <p style={{ color: "#475569", fontSize: 12, marginTop: 16 }}>Si necesitás corregir algo, podés reingresar con el mismo link antes de que expire.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div lang="es" translate="no" style={{ background: "#000", minHeight: "100vh", padding: isMobile ? "24px 16px" : "40px 20px", color: "white", overflowX: "hidden" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", padding: isMobile ? 20 : 28, borderRadius: 16, marginBottom: 24, borderLeft: "4px solid #6366f1" }}>
          <h1 style={{ marginBottom: 8, fontSize: isMobile ? 20 : 24, wordBreak: "break-word" }}>📋 Formulario de Registro</h1>
          <p style={{ color: "#94a3b8", fontSize: isMobile ? 13 : 14, wordBreak: "break-word" }}>Complete sus datos personales para continuar con el proceso editorial.</p>
          <div style={{ marginTop: 12, display: "inline-block", background: daysLeft <= 1 ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.15)", padding: "4px 14px", borderRadius: 99, fontSize: 13, color: daysLeft <= 1 ? "#ef4444" : "#a5b4fc" }}>⏳ Este link expira en {daysLeft} día(s)</div>
        </div>
        <div style={{ ...sectionStyle, padding: isMobile ? 16 : 24 }}>
          <h3 style={sectionTitle}>👤 Datos Personales</h3>
          <div ref={refs.ci}><label style={labelStyle}>Cédula de Identidad <Req /></label><input placeholder="Ej: 1234567" value={ci} onChange={e => setCi(e.target.value.replace(/\D/g, ""))} style={errors.ci ? inputError : inputStyle} />{errors.ci && <p style={errorText}>{errors.ci}</p>}</div>
          <div ref={refs.nombres}><label style={labelStyle}>Nombres <Req /></label><input placeholder="Ej: JUAN CARLOS" value={nombres} onChange={e => setNombres(soloLetrasMayusculas(e.target.value))} style={errors.nombres ? inputError : inputStyle} />{errors.nombres && <p style={errorText}>{errors.nombres}</p>}</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            <div ref={refs.apellidoPaterno}><label style={labelStyle}>Apellido Paterno <Req /></label><input placeholder="Ej: FERNÁNDEZ" value={apellidoPaterno} onChange={e => setApellidoPaterno(soloLetrasMayusculas(e.target.value))} style={errors.apellidoPaterno ? inputError : inputStyle} />{errors.apellidoPaterno && <p style={errorText}>{errors.apellidoPaterno}</p>}</div>
            <div ref={refs.apellidoMaterno}><label style={labelStyle}>Apellido Materno</label><input placeholder="Ej: MAMANI" value={apellidoMaterno} onChange={e => setApellidoMaterno(soloLetrasMayusculas(e.target.value))} style={errors.apellidoMaterno ? inputError : inputStyle} />{errors.apellidoMaterno && <p style={errorText}>{errors.apellidoMaterno}</p>}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div ref={refs.sexo}><label style={labelStyle}>Sexo <Req /></label><select value={sexo} onChange={e => setSexo(e.target.value as Sexo)} style={errors.sexo ? { ...inputError, cursor: "pointer" } : { ...inputStyle, cursor: "pointer" }}><option value="">-- Seleccionar --</option>{SEXOS.map(s => <option key={s} value={s}>{s}</option>)}</select>{errors.sexo && <p style={errorText}>{errors.sexo}</p>}</div>
            <div ref={refs.ciudad}><label style={labelStyle}>Ciudad <Req /></label><input placeholder="Ej: LA PAZ" value={ciudad} onChange={e => setCiudad(soloLetrasMayusculas(e.target.value))} style={errors.ciudad ? inputError : inputStyle} />{errors.ciudad && <p style={errorText}>{errors.ciudad}</p>}</div>
          </div>
          <div ref={refs.direccion} style={{ marginTop: 12 }}><label style={labelStyle}>Dirección <Req /></label><input placeholder="Ej: AVENIDA BOLIVIA NRO 7" value={direccion} onChange={e => setDireccion(e.target.value.toUpperCase())} style={errors.direccion ? inputError : inputStyle} />{errors.direccion && <p style={errorText}>{errors.direccion}</p>}</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            <div ref={refs.fechaNacimiento}><label style={labelStyle}>Fecha de Nacimiento <Req /></label><input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} style={errors.fechaNacimiento ? inputError : inputStyle} />{errors.fechaNacimiento && <p style={errorText}>{errors.fechaNacimiento}</p>}</div>
            <div ref={refs.extension}><label style={labelStyle}>Extensión (Depto. C.I.) <Req /></label><select translate="no" value={extension} onChange={e => setExtension(e.target.value as Extension)} style={errors.extension ? { ...inputError, cursor: "pointer" } : { ...inputStyle, cursor: "pointer" }}><option value="">-- Seleccionar --</option>{EXTENSIONES.map(ext => <option key={ext} value={ext} translate="no">{ext}</option>)}</select>{errors.extension && <p style={errorText}>{errors.extension}</p>}</div>
          </div>
          <div ref={refs.profesion} style={{ marginTop: 12 }}><label style={labelStyle}>Profesión <Req /></label><input placeholder="Ej: MAESTRO DE MATEMÁTICAS" value={profesion} onChange={e => setProfesion(soloLetrasMayusculas(e.target.value))} style={errors.profesion ? inputError : inputStyle} />{errors.profesion && <p style={errorText}>{errors.profesion}</p>}</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            <div ref={refs.celular}><label style={labelStyle}>Celular <Req /></label><input placeholder="Ej: 70012345" value={celular} onChange={e => setCelular(e.target.value.replace(/\D/g, ""))} style={errors.celular ? inputError : inputStyle} />{errors.celular && <p style={errorText}>{errors.celular}</p>}</div>
            <div ref={refs.email}><label style={labelStyle}>Email <Req /></label><input placeholder="Ej: juan@gmail.com" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} style={errors.email ? inputError : inputStyle} />{errors.email && <p style={errorText}>{errors.email}</p>}</div>
          </div>
        </div>
        <div style={{ ...sectionStyle, padding: isMobile ? 16 : 24 }}>
          <h3 style={sectionTitle}>📸 Fotografías y Documentos</h3>
          <div ref={refs.fotografia}>
            <label style={labelStyle}>Foto Personal <Req /></label>
            <div style={{ background: errors.fotografia ? "#450a0a" : "#0f172a", borderRadius: 12, padding: 20, marginBottom: 8, border: errors.fotografia ? "1px solid #ef4444" : "1px solid #334155", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {fotoPreview ? <img src={fotoPreview} alt="preview" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10, border: "2px solid #3b82f6", flexShrink: 0 }} /> : <div style={{ width: 90, height: 90, background: "#1e293b", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0 }}>🤳</div>}
              <div style={{ flex: 1 }}>
                <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>Foto clara de tu rostro</p>
                <p style={{ color: "#475569", fontSize: 11, marginBottom: 8 }}>Máximo {MAX_FILE_SIZE_MB} MB · JPG, PNG</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
  <label style={btnUpload}>
    📷 Tomar foto
    <input type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file && validarTamano(file)) { setFotografia(file); setFotoPreview(URL.createObjectURL(file)); } }} />
  </label>
  <label style={{ ...btnUpload, background: "#1e293b" }}>
    🖼️ Elegir de galería
    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file && validarTamano(file)) { setFotografia(file); setFotoPreview(URL.createObjectURL(file)); } }} />
  </label>
</div>
</div>
            </div>
            {errors.fotografia && <p style={errorText}>{errors.fotografia}</p>}
          </div>
          <div ref={refs.fotoCarnet} style={{ marginTop: 8 }}>
            <label style={labelStyle}>Carnet de Identidad <Req /></label>
            <p style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>Podés tomar/subir una <strong>imagen (JPG, PNG)</strong> del frente o subir un <strong>documento PDF o Word</strong> que contenga ambas caras.</p>
            <div style={{ background: errors.fotoCarnet ? "#450a0a" : "#0f172a", borderRadius: 12, padding: 20, border: errors.fotoCarnet ? "1px solid #ef4444" : "1px solid #334155" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                {carnetPreview && carnetEsImagen ? <img src={carnetPreview} alt="carnet" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10, border: "2px solid #64748b", flexShrink: 0 }} /> : carnetPreview && !carnetEsImagen ? <div style={{ width: 90, height: 90, background: "#1e293b", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0 }}><span style={{ fontSize: 32 }}>📄</span><span style={{ color: "#60a5fa", fontSize: 9, textAlign: "center", padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 82 }}>{carnetPreview}</span></div> : <div style={{ width: 90, height: 90, background: "#1e293b", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0 }}>🪪</div>}
                <div style={{ flex: 1 }}>
                  <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>{carnetEsImagen ? "Frente del carnet" : "Documento subido"}</p>
                  <p style={{ color: "#475569", fontSize: 11, marginBottom: 8 }}>Máximo {MAX_FILE_SIZE_MB} MB · JPG, PNG, PDF</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
  <label style={btnUpload}>
    📷 Tomar foto
    <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) handleCarnet1(file); }} />
  </label>
  <label style={{ ...btnUpload, background: "#1e293b" }}>
    🖼️ Elegir imagen
    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) handleCarnet1(file); }} />
  </label>
  <label style={{ ...btnUpload, background: "#1e293b" }}>
    📄 PDF o Word
    <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) handleCarnet1(file); }} />
  </label>
</div>
</div>
              </div>
              {(carnetEsImagen || !fotoCarnet) && (
                <>
                  <div style={{ borderTop: "1px solid #1e293b", marginBottom: 16 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    {carnetPreview2 ? <img src={carnetPreview2} alt="carnet2" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10, border: "2px solid #64748b", flexShrink: 0 }} /> : <div style={{ width: 90, height: 90, background: "#1e293b", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0, opacity: 0.5 }}>🔄</div>}
                    <div style={{ flex: 1 }}>
                      <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>Reverso del carnet <span style={{ color: "#475569", fontSize: 11 }}>(opcional, solo si subiste imagen)</span></p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
  <label style={{ ...btnUpload, background: "#1e293b" }}>
    📷 Tomar foto
    <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) handleCarnet2(file); }} />
  </label>
  <label style={{ ...btnUpload, background: "#334155" }}>
    🖼️ Elegir imagen
    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) handleCarnet2(file); }} />
  </label>
</div></div>
                  </div>
                </>
              )}
            </div>
            {errors.fotoCarnet && <p style={errorText}>{errors.fotoCarnet}</p>}
          </div>
          <div style={{ background: "#1e3a5f", borderRadius: 8, padding: "10px 14px", marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start" }}><span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span><p style={{ color: "#93c5fd", fontSize: 12, margin: 0, lineHeight: 1.6 }}>Las fotografías e información serán utilizadas exclusivamente para el registro editorial y trámites ante SENAPI. Tus datos están protegidos.</p></div>
        </div>
        <button onClick={irARevisar} style={{ width: "100%", minHeight: 44, padding: 16, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, color: "white", fontSize: 16, fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>Continuar</button>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 16 }}>Podrás confirmar tus datos antes de enviarlos definitivamente.</p>
      </div>
    </div>
  );
}

function Req() { return <span style={{ color: "#ef4444" }}>*</span>; }

const sectionStyle: React.CSSProperties = { background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", padding: 24, borderRadius: 14, marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: "bold", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #1e1b4b" };
const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", padding: 12, marginBottom: 4, minHeight: 44, borderRadius: 8, border: "1px solid #1e1b4b", background: "#0a0a14", color: "white", fontSize: 16, boxSizing: "border-box" };
const inputError: React.CSSProperties = { ...inputStyle, border: "1px solid #ef4444" };
const errorText: React.CSSProperties = { color: "#ef4444", fontSize: 12, marginBottom: 10, marginTop: 2, wordBreak: "break-word" };
const btnUpload: React.CSSProperties = { display: "inline-block", background: "#1e1b4b", border: "none", padding: "10px 14px", minHeight: 44, boxSizing: "border-box", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 13 };

export default ClientForm;