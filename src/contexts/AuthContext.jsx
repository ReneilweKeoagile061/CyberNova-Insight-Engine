import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { getSession, loginUser, logoutUser, setAuthToken } from "../services/api";
import { useB2CAuth, loginRequest, accountToUser } from "../auth/msalConfig";

const AuthContext = createContext(null);

function SessionAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((d) => setUser(d?.user ?? (d?.logged_in ? d : null)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener("africaguard:unauthorized", h);
    return () => window.removeEventListener("africaguard:unauthorized", h);
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

  const getToken = useCallback(async () => null, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken, useB2C: false }}>
      {children}
    </AuthContext.Provider>
  );
}

function B2CAuthProvider({ children }) {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [loading, setLoading] = useState(true);
  const account = accounts[0] || null;
  const user = account ? accountToUser(account) : null;

  useEffect(() => {
    instance.handleRedirectPromise().finally(() => setLoading(false));
  }, [instance]);

  useEffect(() => {
    if (!isAuthenticated || !account) {
      setAuthToken(null);
      return;
    }
    instance
      .acquireTokenSilent({ ...loginRequest, account })
      .then((res) => setAuthToken(res.accessToken))
      .catch(() => setAuthToken(null));
  }, [isAuthenticated, account, instance]);

  const login = useCallback(() => instance.loginRedirect(loginRequest), [instance]);

  const logout = useCallback(
    () => instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin }),
    [instance]
  );

  const getToken = useCallback(async () => {
    if (!account) return null;
    try {
      const res = await instance.acquireTokenSilent({ ...loginRequest, account });
      setAuthToken(res.accessToken);
      return res.accessToken;
    } catch {
      await instance.acquireTokenRedirect(loginRequest);
      return null;
    }
  }, [instance, account]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken, useB2C: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }) {
  if (useB2CAuth) {
    return <B2CAuthProvider>{children}</B2CAuthProvider>;
  }
  return <SessionAuthProvider>{children}</SessionAuthProvider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
