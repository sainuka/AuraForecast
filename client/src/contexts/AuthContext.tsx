import { createContext, useContext, useState, useEffect } from "react";

interface DemoUser {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
  };
}

interface AuthContextType {
  user: DemoUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: DemoUser = {
  id: "4d36312c-54ad-47da-a514-6535093b4280",
  email: "demo@wellness-tracker.com",
  user_metadata: {
    name: "Demo User",
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(DEMO_USER);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUser(DEMO_USER);
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setUser(DEMO_USER);
  };

  const signup = async (email: string, password: string, name?: string) => {
    setUser(DEMO_USER);
  };

  const logout = async () => {
    setUser(DEMO_USER);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
