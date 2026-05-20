import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: "admin" | "cliente" | null;
  clienteId: number | null;
  login: (token: string, username: string, role: "admin" | "cliente", clienteId?: number) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));
  const [role, setRole] = useState<"admin" | "cliente" | null>(
    localStorage.getItem("role") as "admin" | "cliente" | null
  );
  const [clienteId, setClienteId] = useState<number | null>(
    localStorage.getItem("clienteId") ? Number(localStorage.getItem("clienteId")) : null
  );

  const login = (token: string, username: string, role: "admin" | "cliente", clienteId?: number) => {
    localStorage.setItem("token", token);
    localStorage.setItem("username", username);
    localStorage.setItem("role", role);
    if (clienteId) localStorage.setItem("clienteId", String(clienteId));
    else localStorage.removeItem("clienteId");

    setToken(token);
    setUsername(username);
    setRole(role);
    setClienteId(clienteId || null);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("clienteId");
    setToken(null);
    setUsername(null);
    setRole(null);
    setClienteId(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, username, role, clienteId, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);