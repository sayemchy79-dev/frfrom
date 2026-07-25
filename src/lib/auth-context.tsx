import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getCurrentUser,
  refreshCurrentUser,
  signIn as apiSignIn,
  signOut as apiSignOut,
  signUp as apiSignUp,
  type User,
} from "./backend";
import { pluto } from "./pluto-client";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Revalidate the cached user against Pluto on mount so a stale/expired
    // session doesn't silently 401 every subsequent API call.
    refreshCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Keep local state in sync with Pluto: covers TOKEN_REFRESHED,
    // SIGNED_IN / SIGNED_OUT from other tabs, and USER_UPDATED.
    const { data: sub } = pluto.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      const u = session.user;
      setUser({
        id: u.id,
        email: u.email ?? "",
        name: (u.user_metadata?.name as string | undefined) ?? u.email ?? "",
      });
    });

    // Proactively refresh the session when the tab becomes visible again or
    // the network reconnects — otherwise the first API call after long
    // inactivity can race an expired access token and 401.
    const refresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      pluto.auth.refreshSession().catch(() => {
        // If refresh fails (e.g. refresh token revoked), fall back to a full re-check.
        refreshCurrentUser().then((u) => setUser(u)).catch(() => setUser(null));
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const value: AuthCtx = {
    user,
    loading,
    signIn: async (email, password) => {
      const u = await apiSignIn({ email, password });
      setUser(u);
    },
    signUp: async (name, email, password) => {
      const u = await apiSignUp({ name, email, password });
      setUser(u);
    },
    signOut: async () => {
      await apiSignOut();
      setUser(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
