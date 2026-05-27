import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import ClientForm from "./pages/ClientForm";
import ProtectedRoute from "./components/ProtectedRoute";
import Servicios from "./pages/Servicios";
import Acerca from "./pages/Acerca";
import Publicaciones from "./pages/Publicaciones";
import ClientProtectedRoute from "./components/ClientProtectedRoute";
import ClientePanel from "./pages/ClientePanel";
import CarritoPage from "./pages/CarritoPage";
import ProductoDetalle from "./pages/ProductoDetalle";
function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        {/* PÚBLICAS */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/acerca" element={<Acerca />} />
        <Route path="/publicaciones" element={<Publicaciones />} />
        <Route path="/formulario/:token" element={<ClientForm />} />
        <Route path="/carrito" element={<CarritoPage />} />
<Route path="/producto/:id" element={<ProductoDetalle />} />
        {/* PRIVADAS */}
        <Route path="/admin" element={
          <ProtectedRoute><Admin /></ProtectedRoute>
        } />
        <Route path="/cliente" element={
          <ClientProtectedRoute><ClientePanel /></ClientProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

export default App;