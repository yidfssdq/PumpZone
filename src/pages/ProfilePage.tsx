import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, LogOut, ArrowDownToLine, ArrowUpFromLine, Loader2, History, User, Wallet, TrendingUp, Gamepad2, Trophy, RefreshCw, Settings, Key, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBeta } from "@/contexts/BetaContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SOL_MINT = "So11111111111111111111111111111111111111112";

interface CasinoSession {
  id: string;
  game: string;
  bet_amount: number;
  pnl: number;
  result: string;
  multiplier: number | null;
  created_at: string | null;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount_sol: number;
  from_address: string | null;
  to_address: string | null;
  solana_tx_signature: string | null;
  status: string;
  created_at: string;
  note: string | null;
}

const ProfilePage = () => {
  const { user, profile, signOut, setShowAuthModal, refreshProfile } = useAuth();
  const { isBeta } = useBeta();
  const { t } = useLanguage();
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<{ success?: string; error?: string } | null>(null);
  const [sessions, setSessions] = useState<CasinoSession[]>([]);
  const [walletTxs, setWalletTxs] = useState<WalletTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingWalletTxs, setLoadingWalletTxs] = useState(false);

  // Client seed management
  const [clientSeed, setClientSeed] = useState(() => localStorage.getItem("pz_client_seed") || "");
  const [editingSeed, setEditingSeed] = useState(false);
  const [tempSeed, setTempSeed] = useState(clientSeed);

  // Tab from URL hash
  const getInitialTab = () => {
    const hash = window.location.hash.replace("#", "");
    if (["wallet", "history", "settings"].includes(hash)) return hash;
    return "overview";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (["overview", "wallet", "history", "settings"].includes(hash)) setActiveTab(hash);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab === "overview" ? "" : tab;
  };

  useEffect(() => {
    supabase.functions.invoke("get-sol-price")
      .then(({ data }) => {
        if (data?.data) {
          const info = data.data[SOL_MINT];
          if (info?.price) setSolPrice(parseFloat(info.price));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingHistory(true);
    supabase
      .from("casino_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setSessions(data as CasinoSession[]);
        setLoadingHistory(false);
      });
  }, [user]);

  // Fetch wallet transactions
  useEffect(() => {
    if (!user) return;
    setLoadingWalletTxs(true);
    supabase
      .from("wallet_transactions" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }: any) => {
        if (data) setWalletTxs(data as WalletTransaction[]);
        setLoadingWalletTxs(false);
      });
  }, [user]);

  const copyAddress = () => {
    if (profile?.sol_address) {
      navigator.clipboard.writeText(profile.sol_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawing(true);
    setWithdrawResult(null);
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 0.001) { setWithdrawResult({ error: t("profile.invalidAmount") }); setWithdrawing(false); return; }
    if (amount > 100) { setWithdrawResult({ error: "Max 100 SOL per withdrawal" }); setWithdrawing(false); return; }
    if (!withdrawAddress || withdrawAddress.length < 32 || withdrawAddress.length > 44) { setWithdrawResult({ error: t("profile.invalidAddress") }); setWithdrawing(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke("withdraw-sol", { body: { destination: withdrawAddress, amount } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setWithdrawResult({ success: `✅ ${amount} SOL sent! TX: ${data.tx_signature?.slice(0, 12)}...` });
      setWithdrawAddress(""); setWithdrawAmount("");
      await refreshProfile();
      // Refresh wallet transactions
      const { data: txData } = await (supabase.from("wallet_transactions" as any).select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50) as any);
      if (txData) setWalletTxs(txData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      setWithdrawResult({ error: `❌ ${msg}` });
    }
    setWithdrawing(false);
  };

  const saveClientSeed = () => {
    if (tempSeed.length >= 1) {
      localStorage.setItem("pz_client_seed", tempSeed);
      localStorage.setItem("pz_nonce", "0");
      setClientSeed(tempSeed);
      setEditingSeed(false);
    }
  };

  const gameEmoji: Record<string, string> = { blackjack: "🃏", mines: "💣", slots: "🎰", roulette: "🎡", crash: "🚀", plinko: "🎱", dice: "🎲", hilo: "🃏", towers: "🗼" };
  const txTypeIcon: Record<string, { icon: string; color: string }> = {
    deposit: { icon: "↓", color: "text-success" },
    withdrawal: { icon: "↑", color: "text-destructive" },
    win_credit: { icon: "+", color: "text-success" },
    loss_debit: { icon: "-", color: "text-destructive" },
    sweep: { icon: "⇒", color: "text-warning" },
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    const date = new Date(d);
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const totalGames = sessions.length;
  const totalWins = sessions.filter(s => s.result === "win").length;
  const totalPnl = sessions.reduce((s, g) => s + g.pnl, 0);
  const biggestWin = sessions.reduce((max, g) => g.pnl > max ? g.pnl : max, 0);

  if (!isBeta && (!user || !profile)) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-16">
        <User className="w-12 h-12 mx-auto text-primary" />
        <h1 className="text-xl font-display font-bold gradient-text">{t("profile.title")}</h1>
        <p className="text-sm text-muted-foreground font-body">{t("profile.signIn")}</p>
        <button onClick={() => setShowAuthModal(true)}
          className="w-full py-3 rounded-xl text-sm font-body bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-opacity">
          {t("rw.signIn")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl shadow-lg shadow-primary/20">
          😎
        </div>
        <div>
          <h1 className="text-xl font-display font-bold">{profile.username}</h1>
          <p className="text-xs text-muted-foreground font-body">{profile.email}</p>
          <div className="flex gap-2 mt-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-body bg-primary/10 text-primary border border-primary/20">Level {profile.level}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-body bg-success/10 text-success border border-success/20">✓ Verified</span>
          </div>
        </div>
        <button onClick={signOut}
          className="ml-auto p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </motion.div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview" className="text-xs font-body">Overview</TabsTrigger>
          <TabsTrigger value="wallet" className="text-xs font-body">Wallet</TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-body">History</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs font-body">Settings</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ─── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Gamepad2, label: t("profile.gamesPlayed"), value: totalGames.toString() },
              { icon: Trophy, label: t("profile.winRate"), value: totalGames > 0 ? `${((totalWins / totalGames) * 100).toFixed(0)}%` : "—" },
              { icon: TrendingUp, label: t("profile.totalPnl"), value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(4)} SOL`, color: totalPnl >= 0 ? "text-success" : "text-destructive" },
              { icon: Trophy, label: t("profile.biggestWin"), value: `+${biggestWin.toFixed(4)} SOL`, color: "text-warning" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4">
                <s.icon className="w-4 h-4 text-muted-foreground mb-2" />
                <p className={`text-lg font-display font-bold ${s.color || "text-foreground"}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-body">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ─── WALLET ─── */}
        <TabsContent value="wallet" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-display font-semibold">{t("profile.wallet")}</h2>
                <button onClick={refreshProfile}
                  className="p-1.5 rounded-lg hover:bg-muted/50 border border-border text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-success/10 text-success font-body">● Mainnet</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">{t("profile.solBalance")}</p>
                <p className="text-2xl font-display font-bold text-primary">{profile.casino_balance.toFixed(4)} SOL</p>
                {solPrice && <p className="text-xs text-muted-foreground font-body">≈ ${(profile.casino_balance * solPrice).toFixed(2)} USD</p>}
              </div>
              {profile.sol_address && (
                <>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-body mb-1">Your deposit address:</p>
                    <p className="text-[10px] font-mono text-muted-foreground break-all bg-muted/30 p-2 rounded-lg border border-border">{profile.sol_address}</p>
                  </div>
                  <button onClick={copyAddress}
                    className="w-full py-2 rounded-lg text-xs font-body bg-muted/50 border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2">
                    {copied ? <><Check className="w-3.5 h-3.5 text-success" /> {t("profile.copied")}</> : <><Copy className="w-3.5 h-3.5" /> {t("profile.copyAddress")}</>}
                  </button>
                </>
              )}
            </div>

            <div className="glass-card p-5 space-y-4">
              <h2 className="text-sm font-display font-semibold flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-success" /> {t("profile.depositWithdraw")}
              </h2>
              <div className="p-3 rounded-lg bg-success/5 border border-success/20 space-y-1.5">
                <p className="text-xs font-body text-success flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  Auto-deposit active
                </p>
                <p className="text-[10px] text-muted-foreground font-body">
                  Send SOL to your address above. It will be automatically credited to your casino balance in ~1 minute.
                </p>
              </div>

              {!showWithdraw ? (
                <button onClick={() => setShowWithdraw(true)}
                  className="w-full py-2.5 rounded-lg text-xs font-body bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-colors flex items-center justify-center gap-2">
                  <ArrowUpFromLine className="w-4 h-4" /> {t("profile.withdraw")}
                </button>
              ) : (
                <form onSubmit={handleWithdraw} className="space-y-2">
                  <input type="text" value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value.trim())}
                    placeholder={t("profile.destAddress")} required
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                  <div className="flex gap-2">
                    <input type="number" step="0.001" min="0.001" max="100" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                      placeholder="Min 0.001, Max 100 SOL" required
                      className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-xs font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                    <button type="button" onClick={() => setWithdrawAmount(Math.min(profile.casino_balance, 100).toFixed(4))}
                      className="px-2 py-2 rounded-lg text-[10px] font-body bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">MAX</button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowWithdraw(false); setWithdrawResult(null); }}
                      className="flex-1 py-2 rounded-lg text-xs font-body bg-muted border border-border hover:bg-muted/70 transition-colors">{t("profile.cancel")}</button>
                    <button type="submit" disabled={withdrawing}
                      className="flex-1 py-2 rounded-lg text-xs font-body bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40">
                      {withdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
                      {withdrawing ? t("profile.sending") : t("profile.send")}
                    </button>
                  </div>
                  {withdrawResult && (
                    <p className={`text-xs font-body text-center ${withdrawResult.error ? "text-destructive" : "text-success"}`}>
                      {withdrawResult.error || withdrawResult.success}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Wallet Transaction History */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-display font-semibold">Wallet History</h2>
              <span className="ml-auto text-[10px] text-muted-foreground font-body">{walletTxs.filter(tx => tx.note !== 'wallet_created').length} transactions</span>
            </div>
            {loadingWalletTxs ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : walletTxs.filter(tx => tx.note !== 'wallet_created').length === 0 ? (
              <p className="text-xs text-muted-foreground font-body text-center py-6">No wallet transactions yet</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {walletTxs.filter(tx => tx.note !== 'wallet_created').map((tx) => {
                  const typeInfo = txTypeIcon[tx.type] || { icon: "•", color: "text-muted-foreground" };
                  return (
                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <span className={`text-lg font-bold ${typeInfo.color}`}>{typeInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-body font-medium capitalize">{tx.type.replace('_', ' ')}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-body ${tx.status === 'confirmed' ? "bg-success/20 text-success" : tx.status === 'failed' ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                            {tx.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-body">{formatDate(tx.created_at)}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <p className={`text-xs font-display font-bold ${typeInfo.color}`}>
                          {tx.type === 'withdrawal' ? '-' : '+'}{parseFloat(String(tx.amount_sol)).toFixed(6)} SOL
                        </p>
                        {tx.solana_tx_signature && (
                          <a href={`https://solscan.io/tx/${tx.solana_tx_signature}`} target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── HISTORY ─── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-display font-semibold">{t("profile.gameHistory")}</h2>
              <span className="ml-auto text-[10px] text-muted-foreground font-body">{sessions.length} {t("home.games").toLowerCase()}</span>
            </div>
            {loadingHistory ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body text-center py-6">{t("profile.noGames")}</p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-lg">{gameEmoji[s.game] || "🎲"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-body font-medium capitalize">{s.game}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-body ${s.result === "win" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                          {s.result === "win" ? "WIN" : "LOSS"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-body">{formatDate(s.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-body text-muted-foreground">Bet: {s.bet_amount} SOL</p>
                      <p className={`text-xs font-display font-bold ${s.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                        {s.pnl >= 0 ? "+" : ""}{s.pnl.toFixed(4)} SOL
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── SETTINGS ─── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-display font-semibold">{t("profile.clientSeed")}</h2>
            </div>
            <p className="text-[10px] text-muted-foreground font-body">{t("profile.clientSeedDesc")}</p>
            {editingSeed ? (
              <div className="space-y-2">
                <input value={tempSeed} onChange={e => setTempSeed(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary/50" />
                <div className="flex gap-2">
                  <button onClick={() => setEditingSeed(false)} className="flex-1 py-2 rounded-lg text-xs font-body bg-muted border border-border">{t("profile.cancel")}</button>
                  <button onClick={saveClientSeed} className="flex-1 py-2 rounded-lg text-xs font-body bg-primary/10 text-primary border border-primary/20">Save</button>
                </div>
                <p className="text-[10px] text-warning font-body">⚠️ Changing your client seed will reset your nonce to 0</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-[10px] font-mono text-foreground break-all">{clientSeed || "Not set"}</code>
                <button onClick={() => { setTempSeed(clientSeed); setEditingSeed(true); }}
                  className="px-3 py-2 rounded-lg text-[10px] font-body bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">Edit</button>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground font-body">
              Nonce: <span className="font-mono text-foreground">{localStorage.getItem("pz_nonce") || "0"}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
