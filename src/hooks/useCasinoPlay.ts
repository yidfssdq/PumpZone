import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FairnessData {
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  server_seed: string;
}

interface CasinoResult {
  win: boolean;
  pnl: number;
  multiplier: number;
  new_balance: number;
  game_data: Record<string, unknown>;
  fairness?: FairnessData;
}

export const useCasinoPlay = () => {
  const { profile, refreshProfile, setShowAuthModal } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<CasinoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Persistent client seed
  const [clientSeed, setClientSeedState] = useState(() => {
    const saved = localStorage.getItem("pz_client_seed");
    if (saved) return saved;
    const seed = crypto.randomUUID();
    localStorage.setItem("pz_client_seed", seed);
    return seed;
  });

  // Nonce tracking
  const [nonce, setNonce] = useState(() => {
    const saved = localStorage.getItem("pz_nonce");
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem("pz_nonce", String(nonce));
  }, [nonce]);

  const setClientSeed = useCallback((seed: string) => {
    setClientSeedState(seed);
    localStorage.setItem("pz_client_seed", seed);
    // Reset nonce when client seed changes
    setNonce(0);
    localStorage.setItem("pz_nonce", "0");
  }, []);

  const balance = profile?.casino_balance ?? 0;

  const play = useCallback(async (game: string, bet_amount: number, bet_type?: string) => {
    if (!profile) {
      setShowAuthModal(true);
      return null;
    }

    if (bet_amount > balance) {
      setError("Solde insuffisant");
      return null;
    }

    setPlaying(true);
    setError(null);
    setLastResult(null);

    try {
      const currentNonce = nonce;
      const { data, error: fnError } = await supabase.functions.invoke("casino-play", {
        body: { game, bet_amount, bet_type, client_seed: clientSeed, nonce: currentNonce },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const result = data as CasinoResult;
      setLastResult(result);
      setNonce(prev => prev + 1);
      await refreshProfile();
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      setError(msg);
      return null;
    } finally {
      setPlaying(false);
    }
  }, [profile, balance, refreshProfile, setShowAuthModal, clientSeed, nonce]);

  return { play, playing, lastResult, error, balance, setLastResult, setError, clientSeed, setClientSeed, nonce };
};
