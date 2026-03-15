import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Users, Copy, Check, Trophy, Gamepad2, TrendingUp, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBeta } from "@/contexts/BetaContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const RewardsPage = () => {
  const { user, profile, setShowAuthModal } = useAuth();
  const { isBeta } = useBeta();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [playerStats, setPlayerStats] = useState({ games: 0, wins: 0, totalPnl: 0, totalWagered: 0 });
  const referralLink = profile ? `https://pumpzone.lovable.app/ref/${profile.username}` : "";

  useEffect(() => {
    if (!user) return;
    supabase.from("casino_sessions")
      .select("pnl, result, bet_amount")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          setPlayerStats({
            games: data.length,
            wins: data.filter(d => d.result === "win").length,
            totalPnl: data.reduce((s, d) => s + (d.pnl || 0), 0),
            totalWagered: data.reduce((s, d) => s + (d.bet_amount || 0), 0),
          });
        }
      });
  }, [user]);

  const copyRef = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Beta mode: show placeholder
  if (isBeta) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-16">
        <Sparkles className="w-12 h-12 mx-auto text-primary" />
        <h1 className="text-xl font-display font-bold gradient-text">Rewards</h1>
        <p className="text-sm text-muted-foreground font-body">Rewards are coming in Beta — check back soon.</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-16">
        <Gift className="w-12 h-12 mx-auto text-primary" />
        <h1 className="text-xl font-display font-bold gradient-text">{t("rw.rewardsReferrals")}</h1>
        <p className="text-sm text-muted-foreground font-body">{t("rw.signInDesc")}</p>
        <button onClick={() => setShowAuthModal(true)}
          className="w-full py-3 rounded-xl text-sm font-body bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-opacity">
          {t("rw.signIn")}
        </button>
      </div>
    );
  }

  const winRate = playerStats.games > 0 ? ((playerStats.wins / playerStats.games) * 100).toFixed(1) : "0";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-2xl font-display font-bold gradient-text flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" /> {t("rw.title")}
        </h1>
        <p className="text-sm text-muted-foreground font-body">{t("rw.subtitle")}</p>
      </motion.div>

      {/* Your Stats */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h2 className="text-sm font-display font-bold mb-3 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="w-4 h-4 text-primary" /> Your Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Games Played", value: `${playerStats.games}`, icon: Gamepad2, color: "text-primary" },
            { label: "Wins", value: `${playerStats.wins}`, icon: Trophy, color: "text-warning" },
            { label: "Win Rate", value: `${winRate}%`, icon: TrendingUp, color: "text-success" },
            { label: "Total P&L", value: `${playerStats.totalPnl >= 0 ? "+" : ""}${playerStats.totalPnl.toFixed(4)} SOL`, icon: Sparkles, color: playerStats.totalPnl >= 0 ? "text-success" : "text-destructive" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 + i * 0.04 }}
              className="glass-card p-4 group hover:border-primary/15 transition-all">
              <div className="flex items-center gap-2 mb-1.5">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-body">{s.label}</span>
              </div>
              <p className={`text-lg font-display font-black ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Level & XP */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center">
                <span className="text-lg font-display font-black text-primary">{profile?.level ?? 1}</span>
              </div>
              <div>
                <p className="text-sm font-display font-bold">Level {profile?.level ?? 1}</p>
                <p className="text-[10px] text-muted-foreground font-body">{profile?.xp ?? 0} / {(profile?.level || 1) * 100} XP</p>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-body">
              {playerStats.totalWagered.toFixed(4)} SOL wagered
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((profile?.xp || 0) / ((profile?.level || 1) * 100)) * 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
            />
          </div>
        </div>
      </motion.div>

      {/* Coming Soon: Daily Rewards */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="glass-card p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
          <div className="relative z-10">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-display font-bold gradient-text mb-1">Daily Rewards & Missions</h3>
            <p className="text-xs text-muted-foreground font-body max-w-sm mx-auto">
              Daily login bonuses, weekly missions, and achievement rewards are coming soon. Stay tuned!
            </p>
            <span className="inline-block mt-3 px-3 py-1 rounded-full text-[10px] font-display font-bold bg-primary/10 text-primary border border-primary/20">
              Coming Soon
            </span>
          </div>
        </div>
      </motion.div>

      {/* Referral */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="text-sm font-display font-bold mb-3 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <Users className="w-4 h-4 text-success" /> {t("rw.referral")}
        </h2>
        <div className="glass-card p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-lg font-display font-bold text-foreground">0</p>
              <p className="text-[10px] text-muted-foreground font-body">{t("rw.referred")}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-lg font-display font-bold text-success">0.00</p>
              <p className="text-[10px] text-muted-foreground font-body">{t("rw.earnings")}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-lg font-display font-bold text-primary">5%</p>
              <p className="text-[10px] text-muted-foreground font-body">{t("rw.commission")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input readOnly value={referralLink}
              className="flex-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-xs font-mono text-muted-foreground" />
            <button onClick={copyRef}
              className="px-3 py-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground font-body text-center">{t("rw.referralDesc")}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default RewardsPage;
