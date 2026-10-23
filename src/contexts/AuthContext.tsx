import { clearLocalData } from "@/lib/local-data";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId, getDeviceName } from "@/lib/device";
import { cloudLoginService } from "@/services/cloud-login.service";

export { getDeviceId, getDeviceName };

interface User {
  id: string;
  email: string;
  name: string;
  tier: "FREE" | "PRO";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const supabaseUser = session.user;
        setToken(session.access_token);

        const { data: profile } = await supabase
          .from("profiles")
          .select("name, tier")
          .eq("auth_id", supabaseUser.id)
          .maybeSingle();

        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || "",
          name: profile?.name || supabaseUser.user_metadata?.name || "",
          tier: (profile?.tier as "FREE" | "PRO") || "FREE",
        });
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setToken(session.access_token);

        const { data: profile } = await supabase
          .from("profiles")
          .select("name, tier")
          .eq("auth_id", session.user.id)
          .maybeSingle();

        setUser({
          id: session.user.id,
          email: session.user.email || "",
          name: profile?.name || session.user.user_metadata?.name || "",
          tier: (profile?.tier as "FREE" | "PRO") || "FREE",
        });
      } else {
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    // Lepas jatah perangkat ini di server sebelum sesi dihapus.
    await cloudLoginService.release();

    try { await supabase.auth.signOut(); } catch { /* offline: still clear locally */ }

    await clearLocalData();

    window.location.replace("/");
  };

  const value = {
    user,
    token,
    loading,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
