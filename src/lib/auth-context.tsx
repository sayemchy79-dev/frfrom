import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, signIn as apiSignIn, signOut as apiSignOut, signUp as apiSignUp, type User } from "./backend";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getCurrentUser());
    setLoading(false);
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
