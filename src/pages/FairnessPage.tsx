import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, Hash, Eye, Server, UserCheck, Search, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToFloat(hex: string): number {
  return parseInt(hex.substring(0, 8), 16) / 0xFFFFFFFF;
}

interface BetHistory {
  id: string;
  game: string;
  result: string;
  pnl: number;
  bet_amount: number;
  server_seed_hash: string | null;
  client_seed: string | null;
  nonce: number | null;
  created_at: string | null;
}

const FairnessPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  // Verify form
  const [vServerSeed, setVServerSeed] = useState("");
  const [vClientSeed, setVClientSeed] = useState("");
  const [vNonce, setVNonce] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ roll: number; hash: string; hashMatch: boolean } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Recent bets
  const [bets, setBets] = useState<BetHistory[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [revealedSeeds, setRevealedSeeds] = useState<Record<string, string>>({});

  const handleVerify = async () => {
    if (!vServerSeed || !vClientSeed) return;
    setVerifying(true);
    try {
      const computedHash = await sha256(vServerSeed);
      const hmac = await hmacSha256(vServerSeed, `${vClientSeed}:${vNonce || "0"}`);
      const roll = hexToFloat(hmac);
      setVerifyResult({ roll, hash: computedHash, hashMatch: true });
    } catch {
      setVerifyResult(null);
    }
    setVerifying(false);
  };

  const loadBets = async () => {
    if (!user) return;
    setLoadingBets(true);
    const { data } = await supabase
      .from("casino_sessions")
      .select("id, game, result, pnl, bet_amount, server_seed_hash, client_seed, nonce, created_at")
      .eq("user_id", user.id)
      .not("server_seed_hash", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setBets(data as BetHistory[]);
    setLoadingBets(false);
  };

  const revealSeed = async (sessionId: string) => {
    const { data } = await supabase.functions.invoke("reveal-seed", {
      body: { session_id: sessionId },
    });
    if (data?.server_seed) {
      setRevealedSeeds(prev => ({ ...prev, [sessionId]: data.server_seed }));
    }
  };

  const STEPS = [
    { icon: Server, title: t("fair.step1"), desc: t("fair.step1Desc") },
    { icon: UserCheck, title: t("fair.step2"), desc: t("fair.step2Desc") },
    { icon: Hash, title: t("fair.step3"), desc: t("fair.step3Desc") },
    { icon: Eye, title: t("fair.step4"), desc: t("fair.step4Desc") },
  ];

  const gameEmoji: Record<string, string> = { blackjack: "🃏", mines: "💣", slots: "🎰", roulette: "🎡", crash: "🚀", plinko: "🎱", dice: "🎲", hilo: "🃏", towers: "🗼" };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold gradient-text">{t("fair.title")}</h1>
        <p className="text-sm text-muted-foreground font-body max-w-lg mx-auto">{t("fair.desc")}</p>
      </motion.div>

      <div className="space-y-4">
        {STEPS.map((step, i) => (
          <motion.div key={step.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-card p-5 flex items-start gap-4">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <step.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-display text-primary">{t("home.step")} {i + 1}</span>
                <h3 className="text-sm font-body font-semibold">{step.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground font-body">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── VERIFY A BET ─── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold">{t("fair.verify")}</h3>
        </div>
        <div className="space-y-2">
          <input value={vServerSeed} onChange={e => setVServerSeed(e.target.value)}
            placeholder="Server Seed" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
          <input value={vClientSeed} onChange={e => setVClientSeed(e.target.value)}
            placeholder="Client Seed" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
          <input value={vNonce} onChange={e => setVNonce(e.target.value)} type="number"
            placeholder="Nonce" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
          <button onClick={handleVerify} disabled={verifying || !vServerSeed || !vClientSeed}
            className="w-full py-2.5 rounded-lg text-xs font-body bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {t("fair.verifyBtn")}
          </button>
        </div>
        {verifyResult && (
          <div className="space-y-2 pt-2">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-[10px] text-muted-foreground font-body mb-1">SHA-256(server_seed)</p>
              <p className="text-[10px] font-mono text-foreground break-all">{verifyResult.hash}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-[10px] text-muted-foreground font-body mb-1">HMAC-SHA256 → Roll</p>
              <p className="text-sm font-display font-bold text-foreground">{verifyResult.roll.toFixed(6)}</p>
              <p className="text-[10px] text-muted-foreground font-body mt-1">
                {verifyResult.roll < 0.65 ? (
                  <span className="text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> WIN (roll &lt; 0.65)</span>
                ) : (
                  <span className="text-destructive flex items-center gap-1"><XCircle className="w-3 h-3" /> LOSS (roll ≥ 0.65)</span>
                )}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground font-body text-center">
              HMAC-SHA256(server_seed, client_seed + ":" + nonce) → first 8 hex chars → uint32 / 0xFFFFFFFF
            </p>
          </div>
        )}
      </motion.div>

      {/* ─── RECENT BETS ─── */}
      {user && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-display font-semibold">{t("fair.recentBets")}</h3>
            </div>
            <button onClick={loadBets} disabled={loadingBets}
              className="px-3 py-1.5 rounded-lg text-[10px] font-body bg-muted/50 border border-border hover:bg-muted transition-colors flex items-center gap-1">
              {loadingBets ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {t("fair.loadBets")}
            </button>
          </div>
          {bets.length > 0 && (
            <div className="space-y-2">
              {bets.map(bet => (
                <div key={bet.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{gameEmoji[bet.game] || "🎲"}</span>
                      <span className="text-xs font-body capitalize">{bet.game}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${bet.result === "win" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                        {bet.result === "win" ? "WIN" : "LOSS"}
                      </span>
                    </div>
                    <span className={`text-xs font-display font-bold ${bet.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                      {bet.pnl >= 0 ? "+" : ""}{bet.pnl.toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground break-all">
                    Hash: {bet.server_seed_hash?.substring(0, 20)}... | Client: {bet.client_seed?.substring(0, 12)}... | Nonce: {bet.nonce}
                  </div>
                  {revealedSeeds[bet.id] ? (
                    <div className="p-2 rounded bg-success/5 border border-success/20">
                      <p className="text-[10px] font-mono text-success break-all">Server Seed: {revealedSeeds[bet.id]}</p>
                      <button onClick={() => {
                        setVServerSeed(revealedSeeds[bet.id]);
                        setVClientSeed(bet.client_seed || "");
                        setVNonce(String(bet.nonce || 0));
                      }} className="text-[10px] text-primary font-body mt-1 hover:underline">
                        → {t("fair.useInVerifier")}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => revealSeed(bet.id)}
                      className="text-[10px] text-primary font-body hover:underline flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {t("fair.revealSeed")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ─── ALGORITHM EXPLANATION ─── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold">{t("fair.algorithm")}</h3>
        </div>
        <div className="space-y-1.5 text-[11px] font-body text-muted-foreground">
          <p>1. Server generates a random <code className="text-foreground">server_seed</code> and commits <code className="text-foreground">SHA-256(server_seed)</code> before the bet</p>
          <p>2. Player provides a <code className="text-foreground">client_seed</code> (stored locally, changeable anytime)</p>
          <p>3. A <code className="text-foreground">nonce</code> increments with each bet</p>
          <p>4. Outcome = <code className="text-foreground">HMAC-SHA256(server_seed, client_seed + ":" + nonce)</code></p>
          <p>5. First 8 hex chars → unsigned int → divide by 0xFFFFFFFF → float [0, 1]</p>
          <p>6. If float &lt; 0.65 → <span className="text-success">WIN</span>, else → <span className="text-destructive">LOSS</span> (player-favored: 65% win rate)</p>
          <p>7. After the bet, server_seed is revealed for independent verification</p>
        </div>
      </motion.div>
    </div>
  );
};

export default FairnessPage;
