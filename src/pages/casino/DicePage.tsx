import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBeta } from "@/contexts/BetaContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCasinoPlay } from "@/hooks/useCasinoPlay";
import DemoToggle from "@/components/casino/DemoToggle";
import Confetti from "@/components/casino/Confetti";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";

const DicePage = () => {
  const { isBeta } = useBeta();
  const casino = useCasinoPlay();
  const { playClick, playWin, playLose } = useCasinoSfx();

  const [isDemo, setIsDemo] = useState(true);
  const effectiveDemo = isBeta || isDemo;
  const [demoBalance, setDemoBalance] = useState(100);
  const [bet, setBet] = useState(0.1);
  const [target, setTarget] = useState(50);
  const [mode, setMode] = useState<"over" | "under">("over");
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [history, setHistory] = useState<{ roll: number; win: boolean; pnl: number }[]>([]);

  const balance = effectiveDemo ? demoBalance : (casino.balance ?? 0);
  const winChance = mode === "over" ? (99.99 - target) / 100 : target / 100;
  const multiplier = Math.max(1.01, parseFloat((0.99 / winChance).toFixed(4)));

  const roll = useCallback(async () => {
    if (bet > balance || bet <= 0 || rolling) return;
    playClick();
    setRolling(true);
    setShowConfetti(false);
    if (effectiveDemo) setDemoBalance(p => p - bet);

    const steps = 12;
    for (let i = 0; i < steps; i++) {
      await new Promise(r => setTimeout(r, 40));
      setLastRoll(parseFloat((Math.random() * 99.99).toFixed(2)));
    }

    const result = parseFloat((Math.random() * 99.99).toFixed(2));
    const win = mode === "over" ? result > target : result < target;
    const pnl = win ? bet * (multiplier - 1) : -bet;

    setLastRoll(result);
    setLastWin(win);
    setHistory(prev => [{ roll: result, win, pnl }, ...prev].slice(0, 20));
    if (effectiveDemo && win) setDemoBalance(p => p + bet * multiplier);
    if (win) { playWin(); if (multiplier >= 5) setShowConfetti(true); } else playLose();
    setRolling(false);
    if (!effectiveDemo) casino.play("dice", bet);
  }, [bet, balance, rolling, target, mode, multiplier, effectiveDemo, playClick, playWin, playLose, casino]);

  const winZoneLeft   = mode === "under" ? 0 : (target / 100) * 100;
  const winZoneWidth  = mode === "under" ? target : (99.99 - target);
  const resultPercent = lastRoll !== null ? (lastRoll / 99.99) * 100 : null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {showConfetti && <Confetti intensity="epic"/>}

      <div className="flex items-center gap-3">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-4 h-4"/></Link>
        <h1 className="text-lg font-display font-bold gradient-text">Dice</h1>
        <div className="ml-auto flex items-center gap-3">
          <DemoToggle isDemo={isDemo} onToggle={setIsDemo}/>
          <span className="text-sm font-display text-primary">{balance.toFixed(4)} SOL</span>
        </div>
      </div>

      {effectiveDemo && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 border border-warning/20">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse"/>
          <span className="text-[11px] font-body font-semibold text-warning">DEMO MODE</span>
        </div>
      )}

      <div className="glass-card p-6 space-y-8">

        {/* Roll result display */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div key={lastRoll ?? "idle"} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`text-7xl font-display font-900 tabular-nums leading-none ${
                lastWin === null ? "text-foreground/30" :
                lastWin ? "text-success text-glow-green" : "text-destructive text-glow-red"
              }`}>
              {lastRoll !== null ? lastRoll.toFixed(2) : "—"}
            </motion.div>
          </AnimatePresence>
          {lastWin !== null && (
            <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={`text-sm font-display font-700 mt-2 ${lastWin ? "text-success" : "text-destructive"}`}>
              {lastWin ? "WIN" : "LOSE"}
            </motion.p>
          )}
        </div>

        {/* Slider visual */}
        <div className="space-y-3">
          <div className="relative h-10 rounded-xl overflow-hidden" style={{ background: "hsl(240 20% 9%)" }}>
            {/* Win zone */}
            <div className="absolute top-0 bottom-0 transition-all duration-200"
              style={{
                left: `${winZoneLeft}%`,
                width: `${winZoneWidth}%`,
                background: "linear-gradient(135deg, hsl(142 70% 35% / 0.3), hsl(142 70% 45% / 0.2))",
                borderLeft: mode === "over" ? "2px solid hsl(142 70% 45% / 0.5)" : undefined,
                borderRight: mode === "under" ? "2px solid hsl(142 70% 45% / 0.5)" : undefined,
              }}/>

            {/* Target line */}
            <div className="absolute top-0 bottom-0 w-0.5 transition-all duration-200"
              style={{ left: `${target}%`, background: "hsl(270 85% 62%)", boxShadow: "0 0 8px hsl(270 85% 62% / 0.8)" }}/>

            {/* Result marker */}
            {resultPercent !== null && (
              <motion.div className="absolute top-1 bottom-1 w-1 rounded-full"
                animate={{ left: `${resultPercent}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={{
                  background: lastWin ? "hsl(142 70% 50%)" : "hsl(0 80% 55%)",
                  boxShadow: lastWin ? "0 0 8px hsl(142 70% 50%)" : "0 0 8px hsl(0 80% 55%)",
                  transform: "translateX(-50%)",
                }}/>
            )}

            {/* Labels */}
            <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
              <span className="text-[10px] font-display text-muted-foreground">0.00</span>
              <span className="text-[10px] font-display text-muted-foreground">99.99</span>
            </div>
          </div>

          {/* Target input */}
          <div className="flex items-center gap-3">
            <input type="range" min={2} max={97} value={target}
              onChange={e => setTarget(+e.target.value)}
              className="flex-1 accent-primary" style={{ cursor: "pointer" }}/>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground font-body">Target:</span>
              <input type="number" value={target} onChange={e => setTarget(Math.min(97, Math.max(2, +e.target.value || 50)))}
                className="input-game w-16 text-center text-sm py-1.5"/>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Win Chance", value: `${(winChance * 100).toFixed(2)}%`, color: "text-primary" },
            { label: "Multiplier",  value: `${multiplier.toFixed(4)}×`,      color: "text-success" },
            { label: "Profit",      value: `${(bet * (multiplier - 1)).toFixed(4)} SOL`, color: "text-foreground" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "hsl(240 20% 9%)", border: "1px solid hsl(240 15% 14%)" }}>
              <p className={`text-sm font-display font-700 ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground font-body mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Mode + bet row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode toggle */}
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "hsl(240 20% 9%)", border: "1px solid hsl(240 15% 14%)" }}>
            {(["over", "under"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-md text-xs font-display font-700 transition-all capitalize ${
                  mode === m ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                }`}>{m === "over" ? `Over ${target}` : `Under ${target}`}</button>
            ))}
          </div>

          {/* Bet */}
          <div className="flex items-center gap-1.5 flex-1">
            <input type="number" value={bet} onChange={e => setBet(Math.max(0, parseFloat(e.target.value)||0))}
              className="input-game flex-1 text-sm" step={0.01} min={0.01}/>
            {[0.01,0.1,0.5].map(v=>(
              <button key={v} onClick={()=>setBet(v)}
                className="px-2 py-2 text-[10px] font-body rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">{v}</button>
            ))}
          </div>

          <motion.button whileTap={{ scale: 0.95 }} onClick={roll}
            disabled={bet > balance || bet <= 0 || rolling}
            className="btn-bet" style={{ width: "auto", paddingLeft: "2rem", paddingRight: "2rem" }}>
            {rolling ? "Rolling..." : "ROLL"}
          </motion.button>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-[11px] text-muted-foreground font-body uppercase tracking-wider mb-3">History</h3>
          <div className="flex gap-1.5 flex-wrap">
            {history.map((h, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-display font-700 ${
                  h.win ? "bg-success/15 text-success border border-success/20" : "bg-destructive/15 text-destructive border border-destructive/20"
                }`}>
                {h.roll.toFixed(1)}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DicePage;
