import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBeta } from "@/contexts/BetaContext";
import { useAuth } from "@/contexts/AuthContext";
import DemoToggle from "@/components/casino/DemoToggle";
import Confetti from "@/components/casino/Confetti";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";

// Symbol definitions — SVG-based, not emoji
type Sym = "seven" | "diamond" | "star" | "bell" | "cherry" | "lemon";

const SYMBOLS: Sym[] = ["seven", "diamond", "star", "bell", "cherry", "lemon"];

// Weighted distribution: sevens are rarest
const REEL_STRIP: Sym[] = [
  "cherry","cherry","lemon","lemon","bell","cherry","lemon","bell","star","cherry",
  "lemon","bell","star","diamond","cherry","lemon","bell","star","diamond","seven",
];

const PAYOUTS: Record<string, number> = {
  "seven-seven-seven": 50,
  "diamond-diamond-diamond": 20,
  "star-star-star": 10,
  "bell-bell-bell": 5,
  "cherry-cherry-cherry": 3,
  "lemon-lemon-lemon": 2,
  "cherry-cherry-lemon": 1.5,
  "cherry-cherry-star": 1.5,
};

const getMultiplier = (reels: Sym[]): number => {
  const key = reels.join("-");
  return PAYOUTS[key] || 0;
};

// SVG symbol components
const SymbolSVG = ({ sym, size = 64 }: { sym: Sym; size?: number }) => {
  const s = size;
  const c = s / 2;
  switch (sym) {
    case "seven":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="10" fill="hsl(263,70%,20%)"/>
          <text x="32" y="46" textAnchor="middle" fill="hsl(263,70%,75%)" fontSize="36"
            fontFamily="Orbitron,sans-serif" fontWeight="900">7</text>
        </svg>
      );
    case "diamond":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="10" fill="hsl(217,91%,15%)"/>
          <path d="M32 10 L54 32 L32 54 L10 32Z" fill="hsl(217,91%,60%)" opacity="0.9"/>
          <path d="M32 18 L46 32 L32 46 L18 32Z" fill="hsl(217,91%,80%)" opacity="0.6"/>
          <path d="M32 10 L20 26 L32 26Z" fill="white" opacity="0.15"/>
        </svg>
      );
    case "star":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="10" fill="hsl(45,90%,15%)"/>
          <polygon
            points="32,10 37,27 54,27 41,38 46,55 32,45 18,55 23,38 10,27 27,27"
            fill="hsl(45,90%,60%)" stroke="hsl(45,90%,75%)" strokeWidth="1"/>
        </svg>
      );
    case "bell":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="10" fill="hsl(38,90%,14%)"/>
          {/* Bell shape */}
          <path d="M32 12 C20 12 16 22 16 32 L16 44 L48 44 L48 32 C48 22 44 12 32 12Z"
            fill="hsl(38,90%,55%)"/>
          <rect x="26" y="44" width="12" height="5" rx="2" fill="hsl(38,90%,45%)"/>
          <circle cx="32" cy="50" r="4" fill="hsl(38,90%,35%)"/>
          <ellipse cx="26" cy="20" rx="4" ry="2.5" fill="white" opacity="0.15" transform="rotate(-30 26 20)"/>
        </svg>
      );
    case "cherry":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="10" fill="hsl(0,60%,14%)"/>
          {/* Stems */}
          <path d="M32 20 Q28 14 22 14" stroke="hsl(120,50%,35%)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M32 20 Q36 14 42 14" stroke="hsl(120,50%,35%)" strokeWidth="2" strokeLinecap="round"/>
          {/* Leaves */}
          <ellipse cx="27" cy="13" rx="5" ry="2.5" fill="hsl(120,50%,35%)" transform="rotate(-30 27 13)"/>
          <ellipse cx="37" cy="13" rx="5" ry="2.5" fill="hsl(120,50%,35%)" transform="rotate(30 37 13)"/>
          {/* Cherries */}
          <circle cx="22" cy="36" r="12" fill="hsl(0,80%,45%)"/>
          <circle cx="42" cy="36" r="12" fill="hsl(0,80%,45%)"/>
          <circle cx="18" cy="32" r="3" fill="white" opacity="0.2"/>
          <circle cx="38" cy="32" r="3" fill="white" opacity="0.2"/>
        </svg>
      );
    case "lemon":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="10" fill="hsl(55,80%,14%)"/>
          <ellipse cx="32" cy="34" rx="18" ry="22" fill="hsl(55,95%,55%)" transform="rotate(-15 32 34)"/>
          <ellipse cx="26" cy="26" rx="6" ry="3.5" fill="white" opacity="0.2" transform="rotate(-20 26 26)"/>
          {/* Nub */}
          <path d="M38 14 Q44 10 46 14 Q44 18 38 14Z" fill="hsl(120,50%,40%)"/>
        </svg>
      );
  }
};

const LABEL: Record<Sym, string> = {
  seven: "7", diamond: "💎", star: "★", bell: "🔔", cherry: "Cherry", lemon: "Lemon"
};

const SlotsPage = () => {
  const { isBeta } = useBeta();
  const { playClick, playSpin, playWin, playLose } = useCasinoSfx();

  const [isDemo, setIsDemo] = useState(true);
  const effectiveDemo = isBeta || isDemo;
  const [demoBalance, setDemoBalance] = useState(100);
  const [bet, setBet] = useState(0.1);

  // Each reel shows 3 consecutive symbols from the strip
  const [reelOffsets, setReelOffsets] = useState([0, 4, 9]); // starting positions
  const [spinning, setSpinning] = useState(false);
  const [reelResults, setReelResults] = useState<Sym[]>(["cherry", "lemon", "bell"]);
  const [reelStopped, setReelStopped] = useState([true, true, true]);
  const [winResult, setWinResult] = useState<{ mult: number; pnl: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [history, setHistory] = useState<{ syms: Sym[]; mult: number }[]>([]);
  const animTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const balance = effectiveDemo ? demoBalance : 0;

  useEffect(() => () => animTimers.current.forEach(clearTimeout), []);

  const spin = useCallback(() => {
    if (bet > balance || bet <= 0 || spinning) return;
    playClick();
    setSpinning(true);
    setShowConfetti(false);
    setWinResult(null);
    setReelStopped([false, false, false]);
    if (effectiveDemo) setDemoBalance(p => p - bet);

    const results: Sym[] = [
      REEL_STRIP[Math.floor(Math.random() * REEL_STRIP.length)],
      REEL_STRIP[Math.floor(Math.random() * REEL_STRIP.length)],
      REEL_STRIP[Math.floor(Math.random() * REEL_STRIP.length)],
    ];

    // Spin each reel, stagger stop times
    for (let r = 0; r < 3; r++) {
      // Animate spinning offset
      const spinInterval = setInterval(() => {
        setReelOffsets(prev => {
          const next = [...prev];
          next[r] = (next[r] + 1) % REEL_STRIP.length;
          return next;
        });
        playSpin();
      }, 60);
      animTimers.current.push(spinInterval as unknown as ReturnType<typeof setTimeout>);

      const stopTime = 800 + r * 500;
      const stopTimer = setTimeout(() => {
        clearInterval(spinInterval);
        setReelResults(prev => { const n = [...prev] as Sym[]; n[r] = results[r]; return n; });
        setReelStopped(prev => { const n = [...prev]; n[r] = true; return n; });

        if (r === 2) {
          setTimeout(() => {
            const mult = getMultiplier(results);
            const pnl = bet * mult - bet;
            setWinResult(mult > 0 ? { mult, pnl } : null);
            if (effectiveDemo && mult > 0) setDemoBalance(p => p + bet * mult);
            setHistory(prev => [{ syms: results, mult }, ...prev].slice(0, 8));
            if (mult > 0) { playWin(); if (mult >= 10) setShowConfetti(true); } else playLose();
            setSpinning(false);
          }, 250);
        }
      }, stopTime);
      animTimers.current.push(stopTimer);
    }
  }, [bet, balance, spinning, effectiveDemo, playClick, playSpin, playWin, playLose]);

  // Show 3 symbols per reel, centered on result
  const getReelSymbols = (reelIdx: number): Sym[] => {
    if (reelStopped[reelIdx]) {
      const base = REEL_STRIP.indexOf(reelResults[reelIdx]);
      return [
        REEL_STRIP[(base - 1 + REEL_STRIP.length) % REEL_STRIP.length],
        reelResults[reelIdx],
        REEL_STRIP[(base + 1) % REEL_STRIP.length],
      ];
    }
    const off = reelOffsets[reelIdx];
    return [
      REEL_STRIP[(off - 1 + REEL_STRIP.length) % REEL_STRIP.length],
      REEL_STRIP[off % REEL_STRIP.length],
      REEL_STRIP[(off + 1) % REEL_STRIP.length],
    ];
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {showConfetti && <Confetti intensity="epic" />}

      <div className="flex items-center gap-3">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-lg font-display font-bold gradient-text">Slots</h1>
        <div className="ml-auto flex items-center gap-3">
          <DemoToggle isDemo={isDemo} onToggle={setIsDemo} />
          <span className="text-sm font-display text-primary">{balance.toFixed(4)} SOL</span>
        </div>
      </div>

      {effectiveDemo && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 border border-warning/20">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          <span className="text-[11px] font-body font-semibold text-warning">DEMO MODE</span>
        </div>
      )}

      {/* Machine */}
      <div className="glass-card overflow-hidden">
        {/* Top bar */}
        <div className="bg-gradient-to-r from-primary/30 via-primary/20 to-secondary/30 px-6 py-3 flex items-center justify-between border-b border-border">
          <span className="font-display font-bold text-sm tracking-widest gradient-text">PUMPZONE SLOTS</span>
          <div className="flex gap-1">
            {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-primary/40" style={{animationDelay:`${i*0.2}s`}} />)}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Reels */}
          <div className="relative">
            {/* Win line overlay */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <div className={`h-px mx-2 transition-all duration-300 ${winResult ? "bg-success shadow-[0_0_8px_hsl(160,84%,39%)]" : "bg-white/10"}`} />
            </div>

            <div className="flex items-center gap-3 justify-center">
              {/* Separator */}
              <div className="flex flex-col gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-primary/30" />)}
              </div>

              {[0, 1, 2].map(reelIdx => {
                const syms = getReelSymbols(reelIdx);
                return (
                  <div key={reelIdx}
                    className="flex flex-col items-center overflow-hidden rounded-xl border-2 border-border bg-[hsl(233,40%,6%)] relative"
                    style={{ width: 100, height: 222 }}>
                    {/* Mask gradients */}
                    <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[hsl(233,40%,6%)] to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[hsl(233,40%,6%)] to-transparent z-10 pointer-events-none" />

                    {/* Symbols column */}
                    <div className={`flex flex-col items-center ${spinning && !reelStopped[reelIdx] ? "animate-[slotSpin_0.1s_linear_infinite]" : ""}`}>
                      {syms.map((sym, si) => (
                        <motion.div key={`${reelIdx}-${si}-${sym}`}
                          initial={reelStopped[reelIdx] && si === 1 ? { scale: 0.8, opacity: 0.5 } : {}}
                          animate={reelStopped[reelIdx] && si === 1 ? { scale: 1, opacity: 1 } : {}}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className={`flex items-center justify-center p-3 ${si === 1 ? "" : "opacity-30"}`}
                          style={{ width: 100, height: 74 }}>
                          <SymbolSVG sym={sym} size={si === 1 ? 60 : 48} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-col gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-primary/30" />)}
              </div>
            </div>
          </div>

          {/* Win display */}
          <AnimatePresence>
            {winResult && (
              <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center py-4 rounded-xl bg-success/10 border border-success/30">
                <p className="text-[11px] text-success/70 font-body uppercase tracking-widest mb-1">{winResult.mult}× MULTIPLIER</p>
                <p className="text-3xl font-display font-black text-success">+{winResult.pnl.toFixed(4)} SOL</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bet + spin controls */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-2 glass-card px-3 py-2">
              <span className="text-[10px] text-muted-foreground font-body">BET</span>
              <input type="number" value={bet}
                onChange={e => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 bg-transparent text-sm font-display text-center outline-none"
                step={0.01} min={0.01} disabled={spinning}/>
              <span className="text-[10px] text-muted-foreground font-body">SOL</span>
            </div>
            <div className="flex gap-1">
              {[0.01, 0.05, 0.1, 0.5].map(v => (
                <button key={v} onClick={() => !spinning && setBet(v)}
                  className="px-2.5 py-1.5 text-[10px] font-body rounded bg-muted hover:bg-primary/15 transition-colors">
                  {v}
                </button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.93 }} onClick={spin}
              disabled={bet > balance || bet <= 0 || spinning}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-primary/20">
              <RotateCcw className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
              {spinning ? "Spinning..." : "SPIN"}
            </motion.button>
          </div>
        </div>

        {/* Paytable */}
        <div className="border-t border-border px-6 py-4">
          <p className="text-[10px] text-muted-foreground font-body uppercase tracking-widest mb-3">Paytable</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {(["seven","diamond","star","bell","cherry","lemon"] as Sym[]).map(sym => (
              <div key={sym} className="bg-muted/50 rounded-lg p-2.5 text-center flex flex-col items-center gap-1.5">
                <SymbolSVG sym={sym} size={36} />
                <p className="text-[9px] font-body text-muted-foreground">{LABEL[sym]}</p>
                <p className="text-[11px] font-display font-bold text-primary">
                  {sym === "seven" ? "50×" : sym === "diamond" ? "20×" : sym === "star" ? "10×" : sym === "bell" ? "5×" : sym === "cherry" ? "3×" : "2×"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-[11px] text-muted-foreground font-body uppercase tracking-wider mb-3">History</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex gap-1">
                  {h.syms.map((s, j) => <SymbolSVG key={j} sym={s} size={24} />)}
                </div>
                <span className={`font-display font-bold text-sm ml-auto ${h.mult > 0 ? "text-success" : "text-destructive"}`}>
                  {h.mult > 0 ? `${h.mult}×` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlotsPage;
