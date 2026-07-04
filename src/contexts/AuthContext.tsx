import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "presensi_auth_token";
const DEVICE_ID_KEY = "presensi_device_id";

// Generate device fingerprint
function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Get device name
function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = "Browser";
  let os = "Unknown";

  // Detect browser
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";

  // Detect OS
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "Mac";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS")) os = "iOS";

  return `${browser} on ${os}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mutations
  const loginMutation = useMutation(api.users.login);
  const registerMutation = useMutation(api.users.register);
  const logoutMutation = useMutation(api.users.logout);
  const updateActivity = useMutation(api.users.updateSessionActivity);

  // Query current user
  const currentUser = useQuery(
    api.users.getCurrentUser,
    token ? { token } : "skip"
  );

  // Update user when query returns
  useEffect(() => {
    if (currentUser !== undefined) {
      setUser(currentUser as User | null);
      setLoading(false);
    }
  }, [currentUser]);

  // Update session activity every 5 minutes
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      updateActivity({ token }).catch(() => {
        // Silently fail if session expired
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [token, updateActivity]);

  // Login function
  const login = async (email: string, password: string) => {
    const deviceId = getDeviceId();
    const deviceName = getDeviceName();

    const result = await loginMutation({
      email,
      password,
      deviceId,
      deviceName,
    });

    // Store token
    localStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user as User);
  };

  // Register function
  const register = async (email: string, password: string, name: string) => {
    await registerMutation({ email, password, name });
    // After registration, auto-login
    await login(email, password);
  };

  // Logout function
  const logout = async () => {
    if (token) {
      await logoutMutation({ token });
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
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
