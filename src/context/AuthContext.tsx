import React, { createContext, ReactNode, useContext, useState } from "react";

// ── Athlete type ──────────────────────────────────────────────
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

// ── Context type ──────────────────────────────────────────────
interface AuthContextType {
  athlete: Athlete | null;
  setAthlete: (athlete: Athlete | null) => void;
  updateAthlete: (updates: Partial<Athlete>) => void;
  logout: () => void;
}

// ── Create context ────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
  athlete: null,
  setAthlete: () => {},
  updateAthlete: () => {},
  logout: () => {},
});

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [athlete, setAthleteState] = useState<Athlete | null>(null);

  function setAthlete(a: Athlete | null) {
    setAthleteState(a);
  }

  function updateAthlete(updates: Partial<Athlete>) {
    setAthleteState((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  function logout() {
    setAthleteState(null);
  }

  return (
    <AuthContext.Provider
      value={{ athlete, setAthlete, updateAthlete, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext);
}
