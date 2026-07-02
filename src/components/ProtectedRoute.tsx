import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (role !== "admin") {
    return <Navigate to="/cliente" />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;