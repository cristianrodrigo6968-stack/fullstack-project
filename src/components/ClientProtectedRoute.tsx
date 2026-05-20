import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ClientProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (role !== "cliente") {
    return <Navigate to="/admin" />;
  }

  return <>{children}</>;
}

export default ClientProtectedRoute;