import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSession, loginUser, logoutUser } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(d => setUser(d?.user ?? (d?.logged_in ? d : null)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener("cybernova:unauthorized", h);
    return () => window.removeEventListener("cybernova:unauthorized", h);
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await loginUser(email, password);
    setUser(d?.user ?? d);
    return d;
  }, []);

  const logout = useCallback(async () => {
    try { await logoutUser(); } catch (_) {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}