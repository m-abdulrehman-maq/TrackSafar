import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { get, post, setToken, getToken } from "../models/api";

const AuthContext = createContext(null);

const REDIRECTS = {
  admin: "/admin",
  driver: "/driver",
  passenger: "/passenger",
};

export function redirectForRole(role) {
  return REDIRECTS[role] || "/login";
}

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [authConfig, setAuthConfig] = useState({
    auth_mode: "unknown",
    password_login_enabled: false,
  });
  const [authConfigError, setAuthConfigError] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const loadSession = useCallback(async () => {
    if (!getToken()) {
      setProfile(null);
      setInitializing(false);
      return null;
    }
    try {
      const me = await get("/auth/me");
      setProfile(me);
      return me;
    } catch {
      setToken(null);
      setProfile(null);
      return null;
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    get("/auth/config")
      .then((cfg) => {
        setAuthConfig(cfg);
        setAuthConfigError(false);
      })
      .catch(() => {
        setAuthConfig({ auth_mode: "unknown", password_login_enabled: false });
        setAuthConfigError(true);
      });
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onExpired = () => setProfile(null);
    window.addEventListener("tracksafar:session-expired", onExpired);
    return () =>
      window.removeEventListener("tracksafar:session-expired", onExpired);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const res = await post("/auth/dev/login", { email, password });
    setToken(res.access_token);
    const me = await get("/auth/me");
    setProfile(me);
    return me;
  }, []);

  const register = useCallback(async (payload) => {
    return post("/auth/register", payload);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      authConfig,
      authConfigError,
      initializing,
      login,
      register,
      logout,
      reload: loadSession,
    }),
    [
      profile,
      authConfig,
      authConfigError,
      initializing,
      login,
      register,
      logout,
      loadSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
