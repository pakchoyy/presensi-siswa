import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { syncService } from "@/services/sync.service";

interface CloudUser {
  id: string;
  email: string;
  name: string;
  tier: string;
}

interface CloudAuthContextType {
  cloudEmail: string | null;
  cloudUser: CloudUser | null;
  isCloudConnected: boolean;
  loading: boolean;
  setCloudEmail: (email: string) => void;
  clearCloudEmail: () => void;
}

const CloudAuthContext = createContext<CloudAuthContextType | undefined>(undefined);

const CLOUD_EMAIL_KEY = "presensi_cloud_email";

export function CloudAuthProvider({ children }: { children: ReactNode }) {
  const [cloudEmail, setCloudEmailState] = useState<string | null>(() => {
    const stored = localStorage.getItem(CLOUD_EMAIL_KEY);
    // Validate email format
    if (stored && stored.trim() && stored.includes('@')) {
      return stored.trim();
    }
    // Clear invalid email
    if (stored) {
      localStorage.removeItem(CLOUD_EMAIL_KEY);
    }
    return null;
  });

  // Query user by email - only if valid, with error boundary
  let cloudUser;
  try {
    cloudUser = useQuery(
      api.users.getUserByEmail,
      cloudEmail && cloudEmail.trim() && cloudEmail.includes('@') ? { email: cloudEmail } : "skip"
    );
  } catch (error) {
    console.error('[CloudAuth] getUserByEmail error:', error);
    cloudUser = null;
  }

  const prevConnected = useRef(false);

  // Force sync when cloud connection becomes active
  useEffect(() => {
    const isConnected = !!cloudUser;
    if (isConnected && !prevConnected.current && cloudEmail) {
      // Just connected - trigger full sync
      const normalized = cloudEmail.toLowerCase().trim();
      if (normalized !== cloudEmail) {
        localStorage.setItem(CLOUD_EMAIL_KEY, normalized);
        setCloudEmailState(normalized);
      } else {
        syncService.syncAll(cloudEmail).catch(() => {});
      }
    }
    prevConnected.current = isConnected;
  }, [cloudUser, cloudEmail]);

  const setCloudEmail = (email: string) => {
    localStorage.setItem(CLOUD_EMAIL_KEY, email);
    setCloudEmailState(email);
  };

  const clearCloudEmail = () => {
    localStorage.removeItem(CLOUD_EMAIL_KEY);
    setCloudEmailState(null);
  };

  const value = {
    cloudEmail,
    cloudUser: cloudUser || null,
    isCloudConnected: !!cloudUser,
    loading: cloudEmail !== null && cloudUser === undefined,
    setCloudEmail,
    clearCloudEmail,
  };

  return <CloudAuthContext.Provider value={value}>{children}</CloudAuthContext.Provider>;
}

export function useCloudAuth() {
  const context = useContext(CloudAuthContext);
  if (context === undefined) {
    throw new Error("useCloudAuth must be used within CloudAuthProvider");
  }
  return context;
}
