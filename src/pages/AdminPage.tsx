import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, TrendingUp, Users, Gamepad2, Wallet, ArrowRight, Loader2, AlertTriangle, RefreshCw, Beaker, Mail, Clock, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBeta } from "@/contexts/BetaContext";

interface PlatformStats {
  total_games: number;
  total_players: number;
  total_volume: number;
  total_deposits: number;
  total_withdrawals: number;
  total_casino_balance: number;
  calculated_profits: number;
  waitlist_count: number;
}

interface RecentActivity {
  id: string;
  game: string;
  result: string;
  pnl: number;
  bet_amount: number;
  created_at: string;
}

const AdminPage = () => {
  const { user, setShowAuthModal } = useAuth();
  const { isBeta, setBeta } = useBeta();
  const [adminSecret, setAdminSecret] = useState(() => localStorage.getItem("pz_admin_secret") || "");
  const [authenticated, setAuthenticated] = useState(() => {
    const saved = localStorage.getItem("pz_admin_secret");
    return !!saved && saved.length >= 8;
  });
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<{ success?: string; error?: string } | null>(null);
  const [sweepConfirm, setSweepConfirm] = useState(false);
  const [sweepInput, setSweepInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [lastSweep, setLastSweep] = useState<{ date: string; amount: string } | null>(null);

  const authenticate = () => {
    if (adminSecret.length >= 8) {
      localStorage.setItem("pz_admin_secret", adminSecret);
      setAuthenticated(true);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rpcData } = await supabase.rpc("get_platform_stats");
      const platformStats = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      const { data: deposits } = await supabase
        .from("wallet_transactions" as any)
        .select("amount_sol")
        .eq("type", "deposit")
        .neq("note", "wallet_created");
      const totalDeposits = (deposits || []).reduce((s: number, r: any) => s + parseFloat(r.amount_sol || 0), 0);

      const { data: withdrawals } = await supabase
        .from("wallet_transactions" as any)
        .select("amount_sol")
        .eq("type", "withdrawal");
      const totalWithdrawals = (withdrawals || []).reduce((s: number, r: any) => s + parseFloat(r.amount_sol || 0), 0);

      const { data: balances } = await supabase
        .from("profiles_public" as any)
        .select("casino_balance");
      const totalCasinoBalance = (balances || []).reduce((s: number, r: any) => s + parseFloat(r.casino_balance || 0), 0);

      // Waitlist count via secure RPC
      const { data: wlCount } = await supabase.rpc("get_waitlist_count");
      const waitlistCount = typeof wlCount === 'number' ? wlCount : 0;

      // Recent activity via secure RPC
      const { data: activityData } = await supabase.rpc("get_recent_activity", { p_limit: 50 });
      if (activityData) setRecentActivity(activityData as RecentActivity[]);

      setStats({
        total_games: platformStats?.total_games || 0,
        total_players: platformStats?.total_players || 0,
        total_volume: parseFloat(String(platformStats?.total_volume || 0)),
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        total_casino_balance: totalCasinoBalance,
        calculated_profits: totalDeposits - totalWithdrawals - totalCasinoBalance,
        waitlist_count: waitlistCount || 0,
      });
    } catch (e: any) {
      setError(e.message || "Failed to fetch stats");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) fetchStats();
  }, [authenticated]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        if (authenticated) {
          window.location.hash = "";
          window.location.pathname = "/admin";
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [authenticated]);

  const triggerSweep = async () => {
    if (sweepInput !== "SWEEP") return;
    setSweeping(true);
    setSweepResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("sweep-profits", {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      const amount = data?.swept?.toFixed(6) || "0";
      if (data?.message) {
        setSweepResult({ success: data.message });
      } else {
        setSweepResult({ success: `✅ Swept ${amount} SOL — TX: ${data?.tx_signature?.slice(0, 16)}...` });
      }
      setLastSweep({ date: new Date().toISOString(), amount });
      setSweepConfirm(false);
      setSweepInput("");
      await fetchStats();
    } catch (e: any) {
      setSweepResult({ error: e.message || "Sweep failed" });
    }
    setSweeping(false);
  };

  const gameEmoji: Record<string, string> = { blackjack: "🃏", mines: "💣", slots: "🎰", roulette: "🎡", crash: "🚀", plinko: "🎱", dice: "🎲", hilo: "🃏", towers: "🗼" };

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
        <Shield className="w-12 h-12 text-warning mx-auto" />
        <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground font-body">Enter admin secret to continue.</p>
        <div className="space-y-3">
          <input
            type="password"
            value={adminSecret}
            onChange={e => setAdminSecret(e.target.value)}
            placeholder="ADMIN_SECRET"
            onKeyDown={e => e.key === "Enter" && authenticate()}
            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <button onClick={authenticate}
            className="w-full py-3 rounded-xl text-sm font-body font-semibold bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-opacity">
            Access Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-destructive flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground font-body">Platform financials & management</p>
          </div>
        </div>
        <button onClick={fetchStats} disabled={loading}
          className="p-2.5 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </motion.div>

      {/* Beta Mode Toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Beaker className={`w-5 h-5 ${isBeta ? "text-warning" : "text-muted-foreground"}`} />
            <div>
              <h2 className="text-sm font-display font-bold">Beta Mode</h2>
              <p className="text-[10px] text-muted-foreground font-body">
                {isBeta ? "Beta is ON — all users can browse without account. 'Connect' button is replaced with 'Waitlist'." : "Beta is OFF — normal authentication required."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setBeta(!isBeta)}
            className={`relative w-14 h-7 rounded-full transition-colors ${isBeta ? "bg-warning" : "bg-muted border border-border"}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${isBeta ? "translate-x-7" : "translate-x-0.5"}`} />
          </button>
        </div>
        {isBeta && (
          <div className="mt-3 p-3 rounded-xl bg-warning/5 border border-warning/20 text-xs font-body text-muted-foreground space-y-1">
            <p className="font-semibold text-warning">Beta Testing Instructions:</p>
            <p>1. Toggle Beta ON above</p>
            <p>2. Visit the homepage: the top banner should appear and the pop-up should show</p>
            <p>3. Check the header: the Connect button should now read "Waitlist"</p>
            <p>4. Verify all pages are accessible without logging in</p>
            <p>5. Toggle Beta OFF to restore previous behavior</p>
          </div>
        )}
      </motion.div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-body flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : stats && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: Users, label: "Total Players", value: stats.total_players.toString(), color: "text-primary" },
              { icon: Gamepad2, label: "Total Games", value: stats.total_games.toString(), color: "text-success" },
              { icon: TrendingUp, label: "Total Volume", value: `${stats.total_volume.toFixed(4)} SOL`, color: "text-warning" },
              { icon: Wallet, label: "Net Profits", value: `${stats.calculated_profits.toFixed(6)} SOL`, color: stats.calculated_profits >= 0 ? "text-success" : "text-destructive" },
              { icon: Mail, label: "Waitlist Signups", value: stats.waitlist_count.toString(), color: "text-secondary" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-5">
                <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-body mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Financial Breakdown */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-display font-bold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> Financial Breakdown
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Total Deposits</p>
                <p className="text-lg font-display font-bold text-success mt-1">{stats.total_deposits.toFixed(6)} SOL</p>
              </div>
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Total Withdrawals</p>
                <p className="text-lg font-display font-bold text-destructive mt-1">{stats.total_withdrawals.toFixed(6)} SOL</p>
              </div>
              <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
                <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">User Balances (Liabilities)</p>
                <p className="text-lg font-display font-bold text-warning mt-1">{stats.total_casino_balance.toFixed(6)} SOL</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground font-body">
                <strong>Profit Formula:</strong> Deposits ({stats.total_deposits.toFixed(6)}) − Withdrawals ({stats.total_withdrawals.toFixed(6)}) − User Balances ({stats.total_casino_balance.toFixed(6)}) = <span className={stats.calculated_profits >= 0 ? "text-success font-bold" : "text-destructive font-bold"}>{stats.calculated_profits.toFixed(6)} SOL</span>
              </p>
            </div>
          </div>

          {/* Sweep Profits */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-display font-bold flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-warning" /> Sweep Profits → Revenue Wallet
            </h2>
            <p className="text-xs text-muted-foreground font-body">
              Transfer accumulated profits from the Liquidity wallet to the Revenue wallet. Only sweeps if profits &gt; 0.001 SOL.
            </p>
            {lastSweep && (
              <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Last sweep: {new Date(lastSweep.date).toLocaleString()} — {lastSweep.amount} SOL
              </div>
            )}
            {!sweepConfirm ? (
              <button onClick={() => setSweepConfirm(true)} disabled={stats.calculated_profits < 0.001}
                className="px-6 py-3 rounded-xl text-sm font-body font-semibold bg-gradient-to-r from-warning to-amber-600 text-black hover:opacity-90 transition-opacity disabled:opacity-30 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Sweep Profits
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 space-y-3">
                <p className="text-xs font-body text-warning font-semibold">⚠️ Confirm sweep by typing SWEEP below:</p>
                <input
                  value={sweepInput}
                  onChange={(e) => setSweepInput(e.target.value.toUpperCase())}
                  placeholder="Type SWEEP to confirm"
                  className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-warning/50"
                />
                <div className="flex gap-2">
                  <button onClick={triggerSweep} disabled={sweeping || sweepInput !== "SWEEP"}
                    className="px-5 py-2.5 rounded-xl text-sm font-body font-semibold bg-gradient-to-r from-warning to-amber-600 text-black hover:opacity-90 transition-opacity disabled:opacity-30 flex items-center gap-2">
                    {sweeping ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {sweeping ? "Sweeping..." : "Confirm Sweep"}
                  </button>
                  <button onClick={() => { setSweepConfirm(false); setSweepInput(""); }}
                    className="px-5 py-2.5 rounded-xl text-sm font-body text-muted-foreground bg-muted border border-border hover:bg-muted/80 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {sweepResult && (
              <div className={`p-3 rounded-xl text-sm font-body ${sweepResult.error ? "bg-destructive/10 border border-destructive/20 text-destructive" : "bg-success/10 border border-success/20 text-success"}`}>
                {sweepResult.error || sweepResult.success}
              </div>
            )}
          </div>

          {/* Recent Activity Logs */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-display font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Recent Activity (Last 50)
            </h2>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {recentActivity.length > 0 ? recentActivity.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors text-xs font-body">
                  <div className="flex items-center gap-2">
                    <span>{gameEmoji[a.game] || "🎲"}</span>
                    <span className="capitalize">{a.game}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${a.result === "win" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                      {a.result === "win" ? "WIN" : "LOSS"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{a.bet_amount.toFixed(4)} SOL</span>
                    <span className={a.pnl >= 0 ? "text-success" : "text-destructive"}>
                      {a.pnl >= 0 ? "+" : ""}{a.pnl.toFixed(4)}
                    </span>
                    <span className="text-muted-foreground/50 text-[10px]">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPage;
