import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  email: string | null;
  sol_address: string | null;
  casino_balance: number;
  level: number;
  xp: number;
  last_bet_at: string | null;
  total_wagered: number;
  total_wins: number;
  total_losses: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    // Use profiles_public view to never fetch encrypted_private_key
    const { data, error } = await supabase
      .from("profiles_public" as any)
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile({
        id: data.id,
        username: data.username,
        email: data.email,
        sol_address: data.sol_address,
        casino_balance: parseFloat(data.casino_balance as any) || 0,
        level: data.level ?? 1,
        xp: data.xp ?? 0,
        last_bet_at: data.last_bet_at ?? null,
        total_wagered: parseFloat(data.total_wagered as any) || 0,
        total_wins: data.total_wins ?? 0,
        total_losses: data.total_losses ?? 0,
      });

      // Generate wallet on first login if none exists
      if (!data.sol_address) {
        try {
          await supabase.functions.invoke("generate-wallet");
          const { data: updated } = await supabase
            .from("profiles_public" as any)
            .select("*")
            .eq("id", userId)
            .single();
          if (updated) {
            setProfile(prev => prev ? { ...prev, sol_address: updated.sol_address } : prev);
          }
        } catch (e) {
          console.error("Wallet generation error:", e);
        }
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Auto-refresh balance every 10 seconds
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      fetchProfile(user.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [user?.id, fetchProfile]);

  const signUp = async (email: string, password: string, username: string) => {
    const referralCode = localStorage.getItem("referral_code");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, ...(referralCode ? { referral_code: referralCode } : {}) },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) return { error: error.message };
    if (referralCode) localStorage.removeItem("referral_code");
    return {};
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signUp, signIn, signOut, refreshProfile,
      showAuthModal, setShowAuthModal,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
