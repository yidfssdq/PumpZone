import { useState, useCallback, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "@/components/casino/Confetti";
import DemoToggle from "@/components/casino/DemoToggle";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";
import { useDemoPlay } from "@/hooks/useDemoPlay";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBeta } from "@/contexts/BetaContext";

const PAYOUT: Record<number, number[]> = {
  1:  [0, 3.8],
  2:  [0, 0, 9],
  3:  [0, 0, 3, 26],
  4:  [0, 0, 2, 6, 90],
  5:  [0, 0, 1.5, 4, 14, 300],
  6:  [0, 0, 1, 2, 7, 40, 700],
  7:  [0, 0, 0, 2, 5, 20, 100, 1500],
  8:  [0, 0, 0, 1, 3, 10, 50, 400, 4000],
  9:  [0, 0, 0, 1, 2, 6, 25, 100, 800, 10000],
  10: [0, 0, 0, 0, 2, 5, 15, 50, 200, 1000, 25000],
};

const TOTAL_NUMBERS = 40;
const DRAWN_COUNT   = 10;
// Slower draw: 420ms per ball
const DRAW_DELAY_MS = 420;

const KenoPage = () => {
  const { profile, setShowAuthModal, refreshProfile } = useAuth();
  const demo  = useDemoPlay();
  const { isBeta } = useBeta();
  const [isDemo, setIsDemo]     = useState(!profile || isBeta);
  useEffect(() => { if (isBeta) setIsDemo(true); }, [isBeta]);
  const balance = isDemo ? demo.demoBalance : (profile?.casino_balance ?? 0);
  const sfx = useCasinoSfx();

  const [betInput, setBetInput] = useState("0.01");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [drawn, setDrawn]       = useState<Set<number>>(new Set());
  const [matched, setMatched]   = useState<Set<number>>(new Set());
  const [missed, setMissed]     = useState<Set<number>>(new Set()); // drawn but NOT picked
  const [phase, setPhase]       = useState<"pick" | "drawing" | "result">("pick");
  const [multiplier, setMultiplier] = useState(0);
  const [pnl, setPnl]           = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [history, setHistory]   = useState<{ matches: number; picks: number; mult: number; pnl: number }[]>([]);
  const [currentDraw, setCurrentDraw] = useState<number | null>(null); // last ball drawn

  const bet    = parseFloat(betInput) || 0;
  const picks  = selected.size;
  const maxPicks = 10;

  const toggleNumber = (n: number) => {
    if (phase !== "pick") return;
    const s = new Set(selected);
    if (s.has(n)) s.delete(n);
    else if (s.size < maxPicks) s.add(n);
    setSelected(s);
  };

  const play = useCallback(async () => {
    if (!isDemo && !profile) { setShowAuthModal(true); return; }
    if (bet <= 0 || bet > balance || picks < 1 || phase === "drawing") return;

    setPhase("drawing");
    setDrawn(new Set());
    setMatched(new Set());
    setMissed(new Set());
    setCurrentDraw(null);

    // Generate all drawn numbers
    const pool = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
    const drawSet: number[] = [];
    for (let i = 0; i < DRAWN_COUNT; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      drawSet.push(pool[idx]);
      pool.splice(idx, 1);
    }

    const newDrawn   = new Set<number>();
    const newMatched = new Set<number>();
    const newMissed  = new Set<number>();

    // Animate draws — show ALL balls even if not picked
    for (let i = 0; i < drawSet.length; i++) {
      await new Promise(r => setTimeout(r, DRAW_DELAY_MS));
      const n = drawSet[i];
      newDrawn.add(n);

      if (selected.has(n)) {
        newMatched.add(n);
        sfx.playChipCollect();
      } else {
        newMissed.add(n);
        sfx.playClick();
      }

      setCurrentDraw(n);
      setDrawn(new Set(newDrawn));
      setMatched(new Set(newMatched));
      setMissed(new Set(newMissed));
    }

    setCurrentDraw(null);

    const matchCount  = newMatched.size;
    const payoutTable = PAYOUT[picks] ?? [];
    const rawMult     = payoutTable[matchCount] ?? 0;
    const finalPnl    = parseFloat((bet * rawMult - bet).toFixed(6));

    setMultiplier(rawMult);
    setPnl(finalPnl);
    setHistory(h => [{ matches: matchCount, picks, mult: rawMult, pnl: finalPnl }, ...h.slice(0, 14)]);

    if (isDemo) {
      demo.setDemoBalance(b => b + finalPnl);
    } else {
      await supabase.functions.invoke("casino-play", {
        body: { game: "plinko", bet_amount: bet, bet_type: `keno_picks${picks}_matches${matchCount}` },
      });
      await refreshProfile();
    }

    if (finalPnl > 0) {
      sfx.playWin();
      if (rawMult >= 10) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 2500); }
    } else sfx.playLose();

    setPhase("result");
  }, [bet, balance, picks, phase, selected, isDemo, demo, sfx, profile, refreshProfile, setShowAuthModal]);

  const resetPicks = () => {
    setSelected(new Set());
    setDrawn(new Set());
    setMatched(new Set());
    setMissed(new Set());
    setPhase("pick");
    setCurrentDraw(null);
  };

  const pickRandom = () => {
    if (phase !== "pick") return;
    const pool  = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
    const count = picks > 0 ? picks : 5;
    const rand  = new Set<number>();
    while (rand.size < count && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      rand.add(pool[idx]);
      pool.splice(idx, 1);
    }
    setSelected(rand);
  };

  const currentPayouts = PAYOUT[picks] ?? [];
  const maxPayout      = Math.max(...currentPayouts);

  return (
    <div className="max-w-5xl mx-auto">
      {showConfetti && <Confetti intensity="epic" />}

      <div className="flex items-center gap-3 mb-5">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-sm">🎯</div>
          <h1 className="text-lg font-display font-black tracking-widest text-white uppercase">Keno</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DemoToggle isDemo={isDemo} onToggle={setIsDemo} />
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-display">
            <span className="text-white/50 mr-1">◎</span>
            <span className="text-white font-bold">{balance.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Last ball drawn — flying label */}
      <div className="h-8 flex items-center justify-center mb-2">
        <AnimatePresence mode="wait">
          {currentDraw !== null && (
            <motion.div key={currentDraw}
              initial={{ scale: 2.5, opacity: 0, y: -20 }}
              animate={{ scale: 1,   opacity: 1, y: 0 }}
              exit={   { scale: 0.5, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className={`px-4 py-1 rounded-full font-display font-black text-sm border-2 ${
                selected.has(currentDraw)
                  ? "bg-emerald-500/25 border-emerald-400 text-emerald-300"
                  : "bg-white/8 border-white/20 text-white/60"
              }`}>
              {currentDraw} {selected.has(currentDraw) ? "✓ MATCH!" : ""}
            </motion.div>
          )}
          {phase === "drawing" && currentDraw === null && (
            <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-white/30 font-display tracking-widest">TIRAGE EN COURS…</motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Grid */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-white/8 p-4 sm:p-5"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.07) 0%, rgba(8,8,16,1) 75%)" }}>

            <div className="grid grid-cols-8 gap-1.5 mb-4">
              {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map(n => {
                const isPicked  = selected.has(n);
                const isMatched = matched.has(n);
                const isMissed  = missed.has(n);   // drawn but not picked
                const isDrawn   = drawn.has(n);

                return (
                  <motion.button key={n}
                    onClick={() => toggleNumber(n)}
                    disabled={phase !== "pick"}
                    whileHover={phase === "pick" ? { scale: 1.12, y: -2 } : {}}
                    whileTap={phase === "pick" ? { scale: 0.9 } : {}}
                    animate={
                      isMatched ? { scale: [1, 1.35, 1.05, 1] } :
                      isMissed  ? { scale: [1, 1.12, 1] } :
                      {}
                    }
                    transition={{ duration: 0.3 }}
                    className={`aspect-square rounded-lg text-xs font-display font-black transition-colors relative ${
                      isMatched
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 border-2 border-emerald-300"
                      : isMissed
                        ? "bg-cyan-500/18 text-cyan-300 border border-cyan-400/50 shadow shadow-cyan-400/20"
                      : isPicked
                        ? "bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/60 shadow-lg shadow-cyan-500/20"
                      : phase === "pick"
                        ? "bg-white/5 text-white/60 border border-white/8 hover:bg-white/12 hover:text-white cursor-pointer"
                        : "bg-white/3 text-white/25 border border-white/6"
                    }`}
                  >
                    {n}
                    {/* Ping animation for newly matched */}
                    {isMatched && (
                      <motion.div
                        className="absolute inset-0 rounded-lg border-2 border-emerald-400"
                        initial={{ scale: 1, opacity: 0.8 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between text-xs font-display text-white/40">
              <span>
                <span className="text-cyan-400">{drawn.size}</span>/{DRAWN_COUNT} tirés
                {matched.size > 0 && <span className="ml-2 text-emerald-400">• {matched.size} match</span>}
              </span>
              <span>Sélection: <span className="text-cyan-400">{picks}/{maxPicks}</span></span>
            </div>
          </div>

          {/* Result banner */}
          <AnimatePresence>
            {phase === "result" && (
              <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
                className={`mt-3 rounded-xl border p-4 flex items-center justify-between ${
                  pnl > 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                <div>
                  <div className="text-[10px] text-white/40 font-display uppercase tracking-wider mb-1">
                    {matched.size}/{picks} correspondances
                  </div>
                  <div className={`text-2xl font-display font-black ${pnl > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {pnl > 0 ? "+" : ""}{pnl.toFixed(4)} SOL
                  </div>
                </div>
                {multiplier > 0 && (
                  <div className="text-3xl font-display font-black text-amber-400">{multiplier}×</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="w-full lg:w-[240px] shrink-0 space-y-3">
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
            <label className="text-[9px] tracking-[0.2em] text-white/40 uppercase font-display block">Mise</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 text-xs">◎</span>
              <input type="number" value={betInput} onChange={e => setBetInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-8 pr-3 text-sm font-display text-white focus:border-amber-500/50 outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[0.01, 0.05, 0.1, 0.25, 0.5, 1].map(b => (
                <button key={b} onClick={() => setBetInput(b.toString())}
                  className={`py-1.5 rounded text-[9px] font-display transition-all ${
                    bet === b ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-white/5 text-white/40 border border-white/8 hover:text-white"}`}>{b}</button>
              ))}
            </div>
          </div>

          {picks > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-1.5">
              <label className="text-[9px] tracking-[0.2em] text-white/40 uppercase font-display block">Paiements</label>
              {currentPayouts.map((m, i) => {
                if (m === 0 && i > 0) return null;
                const isActive = matched.size === i && phase === "result";
                return (
                  <div key={i} className={`flex justify-between text-xs px-1 py-0.5 rounded transition-all ${
                    isActive ? "bg-emerald-500/15 text-emerald-300" : "text-white/40"}`}>
                    <span className="font-display">{i} match</span>
                    <span className={`font-display font-bold ${m === maxPayout ? "text-amber-400" : ""}`}>
                      {m > 0 ? `${m}×` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {phase === "pick" && (
              <button onClick={pickRandom}
                className="w-full py-2.5 rounded-xl text-xs font-display font-bold tracking-wider text-white/60 border border-white/15 bg-white/5 hover:bg-white/10 hover:text-white transition-all">
                🎲 Aléatoire {picks > 0 ? `(${picks})` : "(5)"}
              </button>
            )}
            {phase === "result" && (
              <button onClick={resetPicks}
                className="w-full py-2.5 rounded-xl text-xs font-display font-bold tracking-wider text-white border border-white/15 bg-white/8 hover:bg-white/12 transition-all">
                ↺ Changer les numéros
              </button>
            )}
            <motion.button onClick={play}
              disabled={picks < 1 || bet <= 0 || bet > balance || phase === "drawing"}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-xl text-sm font-display font-black tracking-[0.2em] uppercase text-black disabled:opacity-30"
              style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)" }}>
              {phase === "drawing" ? "TIRAGE..." : picks === 0 ? "CHOISIR" : `JOUER (${picks})`}
            </motion.button>
          </div>

          {history.length > 0 && (
            <div className="space-y-1">
              <label className="text-[9px] tracking-[0.2em] text-white/30 uppercase font-display block">Récent</label>
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className={`flex justify-between text-[10px] px-2 py-1 rounded border ${
                  h.pnl > 0 ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-400"
                  : "bg-red-500/5 border-red-500/10 text-red-400"}`}>
                  <span className="font-body">{h.matches}/{h.picks}</span>
                  <span className="font-display font-bold">{h.mult > 0 ? `${h.mult}×` : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KenoPage;
