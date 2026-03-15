import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBeta } from "@/contexts/BetaContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCasinoPlay } from "@/hooks/useCasinoPlay";
import DemoToggle from "@/components/casino/DemoToggle";
import Confetti from "@/components/casino/Confetti";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";

const ROWS = 16;
// Correct Stake-style multipliers for 16 rows — high risk
const MULTIPLIERS = [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000];

// Visual config
const W = 620;
const PIN_R = 4;
const BALL_R = 7;
const TOP_PAD = 30;
const ROW_H = 32;
const PIN_GAP = 30;

// Compute pin center for a given row/col
const pinX = (row: number, col: number) => {
  const pinsInRow = row + 3;
  const rowW = (pinsInRow - 1) * PIN_GAP;
  return (W - rowW) / 2 + col * PIN_GAP;
};
const pinY = (row: number) => TOP_PAD + row * ROW_H + ROW_H / 2;

// Bucket x = midpoint between last-row pin col and col+1
const bucketX = (b: number) => (pinX(ROWS - 1, b) + pinX(ROWS - 1, b + 1)) / 2;
const BUCKET_W = PIN_GAP - 2;
const H = TOP_PAD + ROWS * ROW_H + 60;

const bucketBg = (m: number) =>
  m >= 100 ? "#ef4444" : m >= 10 ? "#f97316" : m >= 2 ? "#eab308" : "#374151";
const bucketFg = (m: number) =>
  m >= 2 ? "#fff" : "#9ca3af";

// Build the ball path through pin rows
const buildPath = () => {
  const path: { x: number; y: number }[] = [];
  // Start above first row center
  path.push({ x: W / 2, y: TOP_PAD - BALL_R - 4 });
  let col = 0;
  for (let row = 0; row < ROWS; row++) {
    const dir = Math.random() > 0.5 ? 1 : 0;
    col += dir;
    // Pin position for this row/col
    const px = pinX(row, col);
    const py = pinY(row);
    // Ball settles just below pin with a slight offset left/right
    const side = dir === 1 ? PIN_GAP * 0.35 : -PIN_GAP * 0.35;
    path.push({ x: px + side, y: py + BALL_R + PIN_R + 1 });
  }
  // Final bucket center at bottom
  path.push({ x: bucketX(col), y: H - 28 });
  return { path, bucket: col };
};

interface Ball {
  id: number;
  path: { x: number; y: number }[];
  bucket: number;
  multiplier: number;
  step: number;
  done: boolean;
}

let uid = 0;

const PlinkoPage = () => {
  const { isBeta } = useBeta();
  const { profile, setShowAuthModal } = useAuth();
  const casino = useCasinoPlay();
  const { playClick, playWin, playLose } = useCasinoSfx();

  const [isDemo, setIsDemo] = useState(true);
  const effectiveDemo = isBeta || isDemo;

  const [demoBalance, setDemoBalance] = useState(100);
  const [bet, setBet] = useState(0.1);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [lastResults, setLastResults] = useState<{ multiplier: number; pnl: number }[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const balance = effectiveDemo ? demoBalance : (casino.balance ?? 0);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const dropBall = useCallback(() => {
    if (bet > balance || bet <= 0) return;
    playClick();
    if (effectiveDemo) setDemoBalance(p => p - bet);

    const { path, bucket } = buildPath();
    const multiplier = MULTIPLIERS[bucket];
    const pnl = bet * multiplier - bet;
    const id = ++uid;

    const ball: Ball = { id, path, bucket, multiplier, step: 0, done: false };
    setBalls(prev => [...prev, ball]);

    // Animate step by step — faster at top, slows down at bottom
    for (let s = 1; s < path.length; s++) {
      const delay = s * 90 + Math.min(s * 4, 40); // slight ease-in
      const t = setTimeout(() => {
        setBalls(prev => prev.map(b => b.id === id ? { ...b, step: s } : b));
      }, delay);
      timers.current.push(t);
    }

    const totalMs = (path.length - 1) * 90 + 40 * path.length;
    const done = setTimeout(() => {
      setBalls(prev => prev.map(b => b.id === id ? { ...b, done: true } : b));
      setActiveBucket(bucket);
      if (effectiveDemo) setDemoBalance(p => p + bet * multiplier);
      setLastResults(prev => [{ multiplier, pnl }, ...prev].slice(0, 12));
      if (multiplier >= 2) { playWin(); if (multiplier >= 10) setShowConfetti(true); } else playLose();

      setTimeout(() => {
        setActiveBucket(null);
        setShowConfetti(false);
        setBalls(prev => prev.filter(b => b.id !== id));
      }, 1800);
    }, totalMs + 200);
    timers.current.push(done);

    if (!effectiveDemo) casino.play("plinko", bet);
  }, [bet, balance, effectiveDemo, playClick, playWin, playLose, casino]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {showConfetti && <Confetti intensity="epic" />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-display font-bold gradient-text">Plinko</h1>
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

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Controls */}
        <div className="lg:w-[260px] shrink-0 space-y-3">
          <div className="glass-card p-4 space-y-4">
            <div>
              <label className="text-[11px] text-muted-foreground font-body uppercase tracking-wider mb-1.5 block">Bet Amount (SOL)</label>
              <input
                type="number" value={bet}
                onChange={e => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm font-display focus:ring-1 focus:ring-primary outline-none"
                step={0.01} min={0.01}
              />
              <div className="flex gap-1.5 mt-2">
                {[0.01, 0.05, 0.1, 0.5, 1].map(v => (
                  <button key={v} onClick={() => setBet(v)}
                    className="flex-1 px-1 py-1 text-[10px] font-body rounded bg-muted hover:bg-primary/15 transition-colors">
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Multiplier preview */}
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-body mb-1">Possible win</p>
              <p className="text-lg font-display font-bold text-success">
                {(bet * 1000).toFixed(2)} SOL
              </p>
              <p className="text-[10px] text-muted-foreground font-body">at max multiplier (1000×)</p>
            </div>

            <motion.button whileTap={{ scale: 0.95 }} onClick={dropBall}
              disabled={bet > balance || bet <= 0}
              className="w-full py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40">
              Drop Ball
            </motion.button>
          </div>

          {/* History */}
          <div className="glass-card p-4">
            <h3 className="text-[11px] text-muted-foreground font-body uppercase tracking-wider mb-2">Recent</h3>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {lastResults.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between text-xs">
                  <span className={`font-display font-bold px-2 py-0.5 rounded text-[10px] ${
                    r.multiplier >= 100 ? "bg-red-500/20 text-red-400" :
                    r.multiplier >= 10  ? "bg-orange-500/20 text-orange-400" :
                    r.multiplier >= 2   ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-muted text-muted-foreground"
                  }`}>{r.multiplier}×</span>
                  <span className={`font-body font-semibold ${r.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                    {r.pnl >= 0 ? "+" : ""}{r.pnl.toFixed(4)}
                  </span>
                </motion.div>
              ))}
              {lastResults.length === 0 && (
                <p className="text-[10px] text-muted-foreground/50 text-center py-4">Drop a ball to start</p>
              )}
            </div>
          </div>
        </div>

        {/* SVG Game board */}
        <div className="flex-1 glass-card overflow-hidden flex flex-col items-center p-3">
          <svg
            width={W} height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="max-w-full h-auto"
            style={{ background: "transparent" }}
          >
            {/* Drop zone indicator */}
            <line x1={W/2} y1={4} x2={W/2} y2={TOP_PAD - BALL_R - 8}
              stroke="hsl(263,70%,58%)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"/>
            <polygon
              points={`${W/2-6},${4} ${W/2+6},${4} ${W/2},${12}`}
              fill="hsl(263,70%,58%)" opacity="0.5"/>

            {/* Pins */}
            {Array.from({ length: ROWS }, (_, row) =>
              Array.from({ length: row + 3 }, (_, col) => {
                const px = pinX(row, col);
                const py = pinY(row);
                return (
                  <circle key={`pin-${row}-${col}`}
                    cx={px} cy={py} r={PIN_R}
                    fill="hsl(214,32%,40%)"
                    stroke="hsl(214,32%,55%)"
                    strokeWidth="0.8"
                  />
                );
              })
            )}

            {/* Buckets */}
            {MULTIPLIERS.map((m, i) => {
              const bx = bucketX(i);
              const by = H - 50;
              const active = activeBucket === i;
              return (
                <g key={`bucket-${i}`}>
                  <motion.rect
                    x={bx - BUCKET_W / 2} y={by}
                    width={BUCKET_W} height={32}
                    rx="3"
                    fill={active ? bucketBg(m) : "hsl(233,20%,10%)"}
                    stroke={active ? bucketBg(m) : "hsl(233,20%,18%)"}
                    strokeWidth="1"
                    animate={active ? { scaleY: [1, 1.12, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    style={{ transformOrigin: `${bx}px ${by}px` }}
                  />
                  <text
                    x={bx} y={by + 14}
                    textAnchor="middle"
                    fill={active ? "#fff" : bucketFg(m)}
                    fontSize={m >= 100 ? "7" : m >= 10 ? "7.5" : "8"}
                    fontFamily="Orbitron,sans-serif"
                    fontWeight="700"
                  >
                    {m >= 1 ? `${m}×` : `${m}`}
                  </text>
                </g>
              );
            })}

            {/* Balls */}
            <AnimatePresence>
              {balls.map(ball => {
                const pos = ball.path[Math.min(ball.step, ball.path.length - 1)];
                const prevPos = ball.path[Math.max(ball.step - 1, 0)];
                return (
                  <motion.circle
                    key={ball.id}
                    r={BALL_R}
                    cx={prevPos.x}
                    cy={prevPos.y}
                    fill="hsl(263,70%,65%)"
                    stroke="hsl(263,70%,80%)"
                    strokeWidth="1.5"
                    filter="drop-shadow(0 0 6px hsl(263,70%,58%))"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      cx: pos.x,
                      cy: pos.y,
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{
                      cx: { type: "spring", stiffness: 280, damping: 22, duration: 0.09 },
                      cy: { type: "spring", stiffness: 280, damping: 22, duration: 0.09 },
                      opacity: { duration: 0.15 },
                      scale: { type: "spring", stiffness: 600, damping: 30 },
                    }}
                  />
                );
              })}
            </AnimatePresence>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default PlinkoPage;
