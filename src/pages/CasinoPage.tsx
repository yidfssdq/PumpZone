import { Link } from "react-router-dom";
import { Lock, Shield, Zap, TrendingUp, Flame, Users, ChevronRight, Sparkles, Star, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { GameIcon } from "@/components/casino/GameIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useBeta } from "@/contexts/BetaContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: [0, 0, 0.2, 1] as const } }),
};

const gameEmoji: Record<string, string> = {
  blackjack: "🃏", mines: "💣", slots: "🎰", roulette: "🎡",
  crash: "🚀", plinko: "🎱", dice: "🎲", hilo: "🂡", towers: "🏗️",
};

const ALL_GAMES = [
  { id: "crash", path: "/casino/crash", icon: "🚀", name: "Crash", desc: "Cash out before it crashes", badge: "HOT", badgeColor: "bg-destructive/20 text-destructive border-destructive/20", multiplier: "∞x", featured: true },
  { id: "blackjack", path: "/casino/blackjack", icon: "🃏", name: "Blackjack", desc: "Beat the dealer to 21", badge: "POPULAR", badgeColor: "bg-primary/20 text-primary border-primary/20", multiplier: "2x" },
  { id: "mines", path: "/casino/mines", icon: "💣", name: "Mines", desc: "Avoid the mines to win", badge: "HOT", badgeColor: "bg-destructive/20 text-destructive border-destructive/20", multiplier: "24x" },
  { id: "plinko", path: "/casino/plinko", icon: "🎱", name: "Plinko", desc: "Drop the ball & win big", badge: "NEW", badgeColor: "bg-success/20 text-success border-success/20", multiplier: "1000x" },
  { id: "slots", path: "/casino/slots", icon: "🎰", name: "Slots", desc: "Match symbols to win", badge: "NEW", badgeColor: "bg-success/20 text-success border-success/20", multiplier: "2x" },
  { id: "roulette", path: "/casino/roulette", icon: "🎡", name: "Roulette", desc: "Pick your color", badge: "CLASSIC", badgeColor: "bg-warning/20 text-warning border-warning/20", multiplier: "2x" },
  { id: "dice", path: "/casino/dice", icon: "🎲", name: "Dice", desc: "Roll over or under", badge: "NEW", badgeColor: "bg-success/20 text-success border-success/20", multiplier: "99x" },
  { id: "hilo", path: "/casino/hilo", icon: "🂡", name: "Hi-Lo", desc: "Higher or lower?", badge: "NEW", badgeColor: "bg-success/20 text-success border-success/20", multiplier: "∞x" },
  { id: "towers", path: "/casino/towers", icon: "🏗️", name: "Towers", desc: "Climb the tower safely", badge: "NEW", badgeColor: "bg-success/20 text-success border-success/20", multiplier: "∞x" },
  { id: "baccarat", path: "/casino/baccarat", icon: "🎴", name: "Baccarat", desc: "Player vs Banker", badge: "NEW", badgeColor: "bg-success/20 text-success border-success/20", multiplier: "8x" },
];

const CasinoPage = () => {
  const { user, profile, setShowAuthModal } = useAuth();
  const { isBeta } = useBeta();
  const { t } = useLanguage();
  const [recentWins, setRecentWins] = useState<{ user: string; game: string; amount: number; time: string }[]>([]);
  const [totalGames, setTotalGames] = useState(0);

  // Filter out blackjack in beta mode
  const GAMES = isBeta ? ALL_GAMES.filter(g => g.id !== "blackjack") : ALL_GAMES;

  useEffect(() => {
    supabase
      .from("casino_sessions")
      .select("pnl, game, created_at, user_id")
      .eq("result", "win")
      .order("pnl", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) {
          setRecentWins(data.map((d: any) => {
            const ago = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 1000);
            const timeStr = ago < 60 ? `${ago}s` : ago < 3600 ? `${Math.floor(ago / 60)}m` : `${Math.floor(ago / 3600)}h`;
            return { user: "Player***", game: d.game, amount: d.pnl, time: timeStr };
          }));
        }
      });
    supabase.from("casino_sessions").select("id", { count: "exact", head: true }).then(({ count }) => {
      if (count !== null) setTotalGames(count);
    });
  }, []);

  const featuredGame = GAMES[0];
  const otherGames = GAMES.slice(1);

  // ─── GUEST VIEW (no login, not beta) ───
  if (!isBeta && (!user || !profile)) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 py-8">
        <motion.div initial="hidden" animate="visible" className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-secondary/10" />
          <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-primary/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/3 w-60 h-60 bg-secondary/8 rounded-full blur-[80px]" />
          <div className="relative z-10 text-center px-6 py-16 sm:py-24 space-y-6">
            <motion.div custom={0} variants={fadeUp}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-body font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3 h-3" /> {GAMES.length} Games Available
              </div>
            </motion.div>
            <motion.h1 custom={1} variants={fadeUp} className="text-4xl sm:text-5xl font-display font-black">
              <span className="gradient-text">Play & Win SOL</span>
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} className="text-sm text-muted-foreground font-body max-w-md mx-auto">
              Provably fair casino games on Solana. Instant payouts, zero manipulation.
            </motion.p>
            <motion.div custom={3} variants={fadeUp} className="flex flex-wrap justify-center gap-3">
              <button onClick={() => setShowAuthModal(true)}
                className="px-8 py-3.5 rounded-xl text-sm font-display font-bold tracking-wider bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-all hover:scale-105 shadow-xl shadow-primary/25">
                Get Started
              </button>
            </motion.div>
            <motion.div custom={4} variants={fadeUp} className="flex justify-center gap-6 pt-4">
              {[
                { icon: Shield, label: "Provably Fair" },
                { icon: Zap, label: "Instant Payout" },
                { icon: Lock, label: "Encrypted" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-body">
                  <f.icon className="w-3.5 h-3.5 text-primary/60" />
                  {f.label}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {GAMES.map((game, i) => (
              <motion.div key={game.id} custom={i} variants={fadeUp}
                onClick={() => setShowAuthModal(true)}
                className="glass-card p-5 text-center cursor-pointer group hover:border-primary/30 transition-all hover:scale-[1.02]">
                <div className="w-12 h-12 mx-auto group-hover:scale-110 transition-transform duration-200"><GameIcon id={game.id} className="w-full h-full" /></div>
                <p className="font-display font-bold text-sm mt-3">{game.name}</p>
                <p className="text-[10px] text-primary font-display font-bold mt-1">{game.multiplier}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── LOGGED-IN / BETA VIEW ───
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header with balance */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black gradient-text">Casino</h1>
          <p className="text-xs text-muted-foreground font-body mt-1">Provably fair games on Solana</p>
        </div>
        <div className="flex items-center gap-3">
          {!isBeta && (
            <div className="glass-card px-4 py-2 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground font-body">Balance</span>
              <span className="text-sm font-display font-bold text-primary">{(profile?.casino_balance ?? 0).toFixed(4)} SOL</span>
            </div>
          )}
          <Link to="/fairness" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-body text-muted-foreground hover:text-foreground bg-muted/50 border border-border hover:border-primary/20 transition-colors">
            <Shield className="w-3.5 h-3.5" /> Fair
          </Link>
        </div>
      </motion.div>

      {/* Stats row */}
      {!isBeta && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-4 gap-2">
          {[
            { icon: TrendingUp, value: `${(profile?.casino_balance ?? 0).toFixed(2)}`, unit: "SOL", label: "Your Balance", color: "text-primary" },
            { icon: Flame, value: `${GAMES.length}`, unit: "", label: "Games Available", color: "text-warning" },
            { icon: Users, value: `${totalGames}`, unit: "", label: "Games Played", color: "text-success" },
            { icon: Zap, value: "×2.0", unit: "", label: "Payout", color: "text-secondary" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 + i * 0.04 }}
              className="glass-card p-3 group hover:border-primary/15 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-body">{s.label}</span>
              </div>
              <p className={`text-lg font-display font-black ${s.color}`}>
                {s.value}<span className="text-[10px] font-body font-normal text-muted-foreground ml-1">{s.unit}</span>
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Featured Game */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Link to={featuredGame.path} className="block relative overflow-hidden rounded-2xl border border-border group hover:border-primary/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-card to-secondary/8 group-hover:from-primary/12 group-hover:to-secondary/12 transition-all duration-700" />
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-primary/5 rounded-full blur-[60px] group-hover:bg-primary/10 transition-all" />
          <div className="relative z-10 flex items-center justify-between p-6 sm:p-8">
            <div className="flex items-center gap-5">
              <motion.div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 group-hover:scale-110 transition-transform duration-500"
                animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
                <GameIcon id={featuredGame.id} className="w-full h-full" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-body border ${featuredGame.badgeColor}`}>
                    🔥 {featuredGame.badge}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-body flex items-center gap-1">
                    <Star className="w-3 h-3 text-warning fill-warning" /> Featured
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-black text-foreground">{featuredGame.name}</h3>
                <p className="text-xs text-muted-foreground font-body mt-0.5">{featuredGame.desc}</p>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-2">
              <span className="text-2xl font-display font-black text-primary">{featuredGame.multiplier}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary font-body transition-colors">
                Play now <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Games Grid */}
      <div>
        <h2 className="text-sm font-display font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <Flame className="w-4 h-4 text-warning" /> All Games
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {otherGames.map((game, i) => (
            <motion.div key={game.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.04 }}>
              <Link to={game.path}
                className="glass-card p-5 block group hover:border-primary/30 transition-all duration-300 relative overflow-hidden hover:shadow-[0_0_30px_hsl(var(--primary)/0.08)]">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-primary/5 group-hover:to-secondary/3 transition-all duration-500" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 mx-auto group-hover:scale-110 transition-transform duration-200"><GameIcon id={game.id} className="w-full h-full" /></div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold font-body border ${game.badgeColor}`}>{game.badge}</span>
                  </div>
                  <p className="font-display font-bold text-sm mb-0.5">{game.name}</p>
                  <p className="text-[10px] text-muted-foreground font-body mb-3 line-clamp-1">{game.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-black text-primary">{game.multiplier}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Wins */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="text-sm font-display font-bold mb-3 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <Trophy className="w-4 h-4 text-warning" /> Recent Wins
        </h2>
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-[1fr_4rem_5rem_3.5rem] gap-3 px-5 py-2.5 text-[9px] text-muted-foreground/60 font-body uppercase tracking-widest border-b border-border">
            <span>Player</span>
            <span>Game</span>
            <span className="text-right">Won</span>
            <span className="text-right">Time</span>
          </div>
          {recentWins.length > 0 ? recentWins.map((win, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.04 }}
              className={`grid grid-cols-[1fr_4rem_5rem_3.5rem] gap-3 px-5 py-3 items-center hover:bg-muted/10 transition-colors ${i < recentWins.length - 1 ? "border-b border-border/50" : ""}`}>
              <span className="text-xs font-body font-medium">{win.user}</span>
              <div className="w-6 h-6 shrink-0"><GameIcon id={win.game} className="w-full h-full" /></div>
              <span className="text-right text-xs font-display font-bold text-success">+{win.amount.toFixed(2)}</span>
              <span className="text-right text-[10px] text-muted-foreground/60 font-body">{win.time} ago</span>
            </motion.div>
          )) : (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-muted-foreground/50 font-body">No wins recorded yet</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Shield, label: "Provably Fair", desc: "HMAC-SHA256" },
          { icon: Zap, label: "Instant Payout", desc: "Direct to wallet" },
          { icon: Lock, label: "Encrypted", desc: "AES-256" },
        ].map((f, i) => (
          <motion.div key={f.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.04 }}
            className="glass-card p-4 text-center hover:border-primary/15 transition-colors group">
            <f.icon className="w-4 h-4 text-primary/60 mx-auto mb-1.5 group-hover:text-primary transition-colors" />
            <p className="text-[11px] font-body font-semibold">{f.label}</p>
            <p className="text-[9px] text-muted-foreground/60 font-body mt-0.5">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CasinoPage;
