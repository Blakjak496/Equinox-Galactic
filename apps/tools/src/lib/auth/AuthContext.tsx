"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { toolsAuth, setOnSessionInvalid, loadPersistedAccessToken, ToolsCharacter, ApiError } from "@/lib/api";
import { startEveSso } from "@/lib/eveSso";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  character: ToolsCharacter | null;
  message: string | null;
  login: () => void;
  completeLogin: (
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ) => Promise<{ ok: boolean; message?: string; reason?: string }>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [character, setCharacter] = useState<ToolsCharacter | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Fires when a background refresh (triggered by api.ts on a 401, or the
    // one below) is rejected - reuse detected, the 30-day ceiling, or the
    // corp no longer being allowed all land here.
    setOnSessionInvalid((msg) => {
      setCharacter(null);
      setStatus("unauthenticated");
      setMessage(msg);
    });
  }, []);

  useEffect(() => {
    (async () => {
      loadPersistedAccessToken();
      const refreshedToken = await toolsAuth.refresh();
      if (!refreshedToken) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const me = await toolsAuth.me();
        setCharacter(me.data);
        setStatus("authenticated");
      } catch {
        setStatus("unauthenticated");
      }
    })();
  }, []);

  const login = useCallback(() => {
    startEveSso();
  }, []);

  const completeLogin = useCallback(
    async (code: string, codeVerifier: string, redirectUri: string) => {
      setStatus("unauthenticated");
      try {
        const result = await toolsAuth.login(code, codeVerifier, redirectUri);
        if (result.ok && result.character) {
          setCharacter(result.character);
          setStatus("authenticated");
          setMessage(null);
          return { ok: true };
        }
        return { ok: false, message: result.message, reason: result.reason };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : "Login failed.",
          reason: err instanceof ApiError ? err.reason : undefined,
        };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await toolsAuth.logout();
    setCharacter(null);
    setStatus("unauthenticated");
  }, []);

  const logoutEverywhere = useCallback(async () => {
    await toolsAuth.logoutEverywhere();
    setCharacter(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider
      value={{ status, character, message, login, completeLogin, logout, logoutEverywhere }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
