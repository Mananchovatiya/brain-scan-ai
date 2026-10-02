import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { request } from "../api/http.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refreshSession = useCallback(async () => {
    const result = await request("/auth/get-session");
    setUser(result.user);
    return result.user;
  }, []);

  useEffect(() => {
    let mounted = true;
    request("/auth/get-session")
      .then((result) => { if (mounted) setUser(result.user); })
      .catch((error) => { if (mounted && error.status === 401) setUser(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const signIn = useCallback(async (credentials) => {
    setBusy(true);
    try {
      const result = await request("/auth/sign-in/email", { method: "POST", body: JSON.stringify(credentials) });
      setUser(result.user);
      return result.user;
    } finally {
      setBusy(false);
    }
  }, []);

  const signUp = useCallback(async (details) => {
    setBusy(true);
    try {
      const result = await request("/auth/sign-up/email", { method: "POST", body: JSON.stringify(details) });
      setUser(result.user);
      return result.user;
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await request("/auth/sign-out", { method: "POST" });
    } finally {
      setUser(null);
      setBusy(false);
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading, busy, signIn, signUp, signOut, refreshSession }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
