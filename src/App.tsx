import { useEffect, useRef } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ClientProtectedRoute from "./components/ClientProtectedRoute";
import { useAuth } from "./context/AuthContext";

// Páginas públicas
import Home from "./pages/public/Home";
import Login from "./pages/public/Login";
import Servicios from "./pages/public/Servicios";
import Acerca from "./pages/public/Acerca";
import CarritoPage from "./pages/public/CarritoPage";
import ProductoDetalle from "./pages/public/ProductoDetalle";
import ClientForm from "./pages/public/ClientForm";

// Páginas de administración
import Admin from "./pages/admin/Admin";
import AdminPagos from "./pages/admin/AdminPagos";
import AdminProductos from "./pages/admin/AdminProductos";
import AdminMensajes from "./pages/admin/AdminMensajes";
import Clients from "./pages/admin/Clients";
import Entregas from "./pages/admin/Entregas";
import Magazines from "./pages/admin/Magazines";
import Books from "./pages/admin/Books";
import Articles from "./pages/admin/Articles";
import Persons from "./pages/admin/Persons";
import Notes from "./pages/admin/Notes";
// Si tienes AdminPedidos, también impleméntalo

// Páginas del cliente
import ClientePanel from "./pages/cliente/ClientePanel";

import ClienteHacerPedido from "./pages/cliente/ClienteHacerPedido";
import ClienteInicio from "./pages/cliente/ClienteInicio";
import ClienteMensajes from "./pages/cliente/ClienteMensajes";
import ClienteMisPedidos from "./pages/cliente/ClienteMisPedidos";
import ClientePassword from "./pages/cliente/ClientePassword";

import ClienteContenido from "./pages/cliente/ClienteContenido";

const TIEMPO_INACTIVIDAD_MS = 20 * 60 * 1000; // 20 minutos

function InactivityWatcher() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const reiniciarTemporizador = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
        navigate("/login");
        alert("Tu sesión se cerró por inactividad. Por favor, inicia sesión nuevamente.");
      }, TIEMPO_INACTIVIDAD_MS);
    };

    const eventos = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    eventos.forEach(ev => window.addEventListener(ev, reiniciarTemporizador));
    reiniciarTemporizador();

    return () => {
      eventos.forEach(ev => window.removeEventListener(ev, reiniciarTemporizador));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, logout, navigate]);

  return null;
}

function App() {
  return (
    <div>
      <Navbar />
      <InactivityWatcher />
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/acerca" element={<Acerca />} />
        <Route path="/carrito" element={<CarritoPage />} />
        <Route path="/producto/:id" element={<ProductoDetalle />} />
        <Route path="/formulario/:token" element={<ClientForm />} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/admin/pagos" element={<ProtectedRoute><AdminPagos /></ProtectedRoute>} />
        <Route path="/admin/productos" element={<ProtectedRoute><AdminProductos /></ProtectedRoute>} />
        <Route path="/admin/mensajes" element={<ProtectedRoute><AdminMensajes /></ProtectedRoute>} />
        <Route path="/admin/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/admin/entregas" element={<ProtectedRoute><Entregas /></ProtectedRoute>} />
        <Route path="/admin/revistas" element={<ProtectedRoute><Magazines /></ProtectedRoute>} />
        <Route path="/admin/libros" element={<ProtectedRoute><Books /></ProtectedRoute>} />
        <Route path="/admin/articulos" element={<ProtectedRoute><Articles /></ProtectedRoute>} />
        <Route path="/admin/personas" element={<ProtectedRoute><Persons /></ProtectedRoute>} />
        <Route path="/admin/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />

        {/* Cliente */}
        <Route path="/cliente" element={<ClientProtectedRoute><ClientePanel /></ClientProtectedRoute>} />
        <Route path="/cliente/hacer-pedido" element={<ClientProtectedRoute><ClienteHacerPedido /></ClientProtectedRoute>} />
        <Route path="/cliente/inicio" element={<ClientProtectedRoute><ClienteInicio /></ClientProtectedRoute>} />
        <Route path="/cliente/mensajes" element={<ClientProtectedRoute><ClienteMensajes /></ClientProtectedRoute>} />
        <Route path="/cliente/pedidos" element={<ClientProtectedRoute><ClienteMisPedidos /></ClientProtectedRoute>} />
        <Route path="/cliente/password" element={<ClientProtectedRoute><ClientePassword /></ClientProtectedRoute>} />
        <Route path="/cliente/contenido" element={<ClientProtectedRoute><ClienteContenido /></ClientProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;