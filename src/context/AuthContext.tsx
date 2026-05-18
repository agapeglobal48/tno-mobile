import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Athlete {
  id: string;
  name: string;
  email: string;
  phone: string;
  cnic: string;
  sport: string;
  province?: string;
  city?: string;
  bio?: string;
  achievements?: string;
  photo_url?: string;
  status: string;
  followers?: number;
  following?: number;
  videos?: number;
}

interface AuthContextType {
  athlete: Athlete | null;
  isLoading: boolean;
  setAthlete: (athlete: Athlete | null) => void;
  updateAthlete: (updates: Partial<Athlete>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  athlete: null,
  isLoading: true,
  setAthlete: () => {},
  updateAthlete: () => {},
  logout: () => {},
});

const STORAGE_KEY = "@tno_athlete";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [athlete, setAthleteState] = useState<Athlete | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted athlete on app start
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setAthleteState(JSON.parse(raw));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const setAthlete = useCallback((a: Athlete | null) => {
    setAthleteState(a);
    if (a) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(a)).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  }, []);

  const updateAthlete = useCallback((updates: Partial<Athlete>) => {
    setAthleteState((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(
        () => {},
      );
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setAthleteState(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{ athlete, isLoading, setAthlete, updateAthlete, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
