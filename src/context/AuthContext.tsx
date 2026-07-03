import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: "admin" | "cliente" | null;
  clienteId: number | null;
  debeCambiarPassword: boolean;
  login: (token: string, username: string, role: "admin" | "cliente", clienteId?: number, debeCambiarPassword?: boolean) => void;
  logout: () => void;
  clearDebeCambiarPassword: () => void;
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
  const [debeCambiarPassword, setDebeCambiarPassword] = useState<boolean>(
    localStorage.getItem("debeCambiarPassword") === "true"
  );

  const login = (
    token: string,
    username: string,
    role: "admin" | "cliente",
    clienteId?: number,
    debeCambiarPassword?: boolean
  ) => {
    localStorage.setItem("token", token);
    localStorage.setItem("username", username);
    localStorage.setItem("role", role);
    if (clienteId) localStorage.setItem("clienteId", String(clienteId));
    else localStorage.removeItem("clienteId");
    localStorage.setItem("debeCambiarPassword", debeCambiarPassword ? "true" : "false");

    setToken(token);
    setUsername(username);
    setRole(role);
    setClienteId(clienteId || null);
    setDebeCambiarPassword(!!debeCambiarPassword);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("clienteId");
    localStorage.removeItem("debeCambiarPassword");
    setToken(null);
    setUsername(null);
    setRole(null);
    setClienteId(null);
    setDebeCambiarPassword(false);
  };

  const clearDebeCambiarPassword = () => {
    localStorage.setItem("debeCambiarPassword", "false");
    setDebeCambiarPassword(false);
  };

  return (
    <AuthContext.Provider
      value={{ token, username, role, clienteId, debeCambiarPassword, login, logout, clearDebeCambiarPassword, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);