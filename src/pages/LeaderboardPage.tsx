import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Flame, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface LeaderboardEntry {
  rank: number;
  username: string;
  games: number;
  totalPnl: number;
  biggestWin: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

const gameEmoji: Record<string, string> = {
  blackjack: "🃏", mines: "💣", slots: "🎰", roulette: "🎡",
  crash: "🚀", plinko: "🎱", dice: "🎲", hilo: "🂡", towers: "🏗️",
};

const LeaderboardPage = () => {
  const { t } = useLanguage();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentBigWins, setRecentBigWins] = useState<{ username: string; game: string; pnl: number }[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Platform stats via secure RPC
      const { data: statsData } = await supabase.rpc("get_platform_stats");
      if (statsData) {
        const s = Array.isArray(statsData) ? statsData[0] : statsData;
        if (s) {
          setTotalPlayers(Number(s.total_players) || 0);
          setTotalGames(Number(s.total_games) || 0);
          setTotalVolume(Number(s.total_volume) || 0);
        }
      }

      // Leaderboard via secure RPC
      const { data: lbData } = await supabase.rpc("get_leaderboard", { p_limit: 15 });
      if (lbData && Array.isArray(lbData)) {
        setLeaderboard(lbData.map((p: any, i: number) => ({
          rank: i + 1,
          username: p.username || "Anonymous",
          games: Number(p.games) || 0,
          totalPnl: Number(p.total_pnl) || 0,
          biggestWin: Number(p.biggest_win) || 0,
        })));
      }

      // Recent big wins via secure RPC
      const { data: bigWins } = await supabase.rpc("get_top_wins", { p_limit: 5 });
      if (bigWins && Array.isArray(bigWins)) {
        setRecentBigWins(bigWins.map((w: any) => ({
          username: w.username || "Anonymous",
          game: w.game,
          pnl: Number(w.pnl) || 0,
        })));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const stats = [
    { icon: Trophy, label: t("lb.totalPlayers"), value: `${totalPlayers}` },
    { icon: TrendingUp, label: t("lb.totalVolume"), value: `${totalVolume.toFixed(2)} SOL` },
    { icon: Gamepad2, label: t("lb.gamesToday"), value: `${totalGames}` },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-2xl font-display font-bold gradient-text flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" /> {t("lb.title")}
        </h1>
        <p className="text-sm text-muted-foreground font-body">{t("lb.subtitle")}</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-display font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-body">{s.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Leaderboard table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_4rem_5rem_5rem] gap-2 px-5 py-3 text-[10px] text-muted-foreground font-body border-b border-border uppercase tracking-wider">
          <span>{t("lb.rank")}</span>
          <span>{t("lb.player")}</span>
          <span className="text-right">{t("lb.games")}</span>
          <span className="text-right">{t("lb.best")}</span>
          <span className="text-right">{t("lb.pnl")}</span>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-body">Loading...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-body">No games played yet</p>
            <p className="text-[10px] text-muted-foreground/60 font-body mt-1">Be the first to play and claim the top spot!</p>
          </div>
        ) : (
          leaderboard.map((player, i) => (
            <motion.div key={player.rank} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className={`grid grid-cols-[3rem_1fr_4rem_5rem_5rem] gap-2 px-5 py-3.5 items-center transition-colors hover:bg-muted/20 ${
                i < leaderboard.length - 1 ? "border-b border-border/30" : ""
              } ${player.rank <= 3 ? "bg-primary/[0.03]" : ""}`}>
              <span className="text-sm font-display">
                {player.rank <= 3 ? MEDALS[player.rank - 1] : <span className="text-xs text-muted-foreground">#{player.rank}</span>}
              </span>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold ${
                  player.rank === 1 ? "bg-warning/20 text-warning" :
                  player.rank === 2 ? "bg-muted text-foreground" :
                  player.rank === 3 ? "bg-warning/10 text-warning/70" :
                  "bg-muted/50 text-muted-foreground"
                }`}>
                  {player.username[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-body font-medium">{player.username}</span>
              </div>
              <span className="text-right text-xs font-body text-muted-foreground">{player.games}</span>
              <span className="text-right text-xs font-display text-warning">
                {player.biggestWin > 0 ? `+${player.biggestWin.toFixed(4)}` : "—"}
              </span>
              <span className={`text-right text-sm font-display font-bold ${player.totalPnl >= 0 ? "text-success" : "text-destructive"}`}>
                {player.totalPnl >= 0 ? "+" : ""}{player.totalPnl.toFixed(4)}
              </span>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Recent big wins */}
      {recentBigWins.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-sm font-display font-bold mb-3 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <Flame className="w-4 h-4 text-warning" /> Biggest Wins
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {recentBigWins.map((w, i) => (
              <div key={i} className="glass-card p-3 text-center">
                <span className="text-2xl block">{gameEmoji[w.game] || "🎲"}</span>
                <p className="text-[10px] text-muted-foreground font-body mt-1 truncate">{w.username}</p>
                <p className="text-xs font-display font-bold text-success mt-0.5">+{w.pnl.toFixed(4)}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LeaderboardPage;
