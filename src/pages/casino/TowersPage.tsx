import { useState, useCallback, useRef, useEffect } from "react";
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

// ─── Game constants ───────────────────────────────────────────────────────────
const BLOCK_W   = 180;  // base block width
const BLOCK_H   = 44;
const MAX_SPEED = 4.0;  // max horizontal drift speed
const ACCEL     = 0.18; // speed increase per level
const MAX_LEVELS = 12;  // how many blocks to stack

// Payout per level stacked (multiplier on bet)
const PAYOUTS = [0, 1.5, 2.0, 2.8, 4.0, 5.5, 8.0, 12, 18, 28, 45, 75, 120];

interface Block {
  id:     number;
  x:      number;   // left edge of block (0 = left wall)
  width:  number;
  color:  string;
}

const COLORS = [
  "#f59e0b","#ef4444","#8b5cf6","#3b82f6","#06b6d4",
  "#10b981","#f97316","#a855f7","#ec4899","#14b8a6",
  "#6366f1","#84cc16",
];

const TowersPage = () => {
  const { profile, setShowAuthModal, refreshProfile } = useAuth();
  const demo = useDemoPlay();
  const { isBeta } = useBeta();
  const [isDemo, setIsDemo]   = useState(!profile || isBeta);
  useEffect(() => { if (isBeta) setIsDemo(true); }, [isBeta]);
  const balance = isDemo ? demo.demoBalance : (profile?.casino_balance ?? 0);
  const sfx     = useCasinoSfx();

  const [betInput, setBetInput] = useState("0.01");
  const [phase, setPhase]   = useState<"idle"|"playing"|"won"|"lost">("idle");
  const [tower, setTower]   = useState<Block[]>([]);         // placed blocks bottom→top
  const [moving, setMoving] = useState<{x:number; dir:number; width:number; id:number}|null>(null);
  const [level, setLevel]   = useState(0);
  const [speed, setSpeed]   = useState(1.5);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastPnl, setLastPnl] = useState<number | null>(null);
  const [history, setHistory] = useState<{ levels: number; mult: number; pnl: number }[]>([]);

  const animRef  = useRef<number>(0);
  const movingRef = useRef(moving);
  movingRef.current = moving;
  const bet = parseFloat(betInput) || 0;

  // ── Canvas setup ─────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CANVAS_W  = 340;
  const CANVAS_H  = MAX_LEVELS * (BLOCK_H + 6) + 80;

  // ── Start game ───────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (!isDemo && !profile) { setShowAuthModal(true); return; }
    if (bet <= 0 || bet > balance) return;

    const first: Block = { id: 0, x: (CANVAS_W - BLOCK_W) / 2, width: BLOCK_W, color: COLORS[0] };
    setTower([first]);
    setLevel(1);
    setSpeed(1.5);
    setPhase("playing");
    setLastPnl(null);

    // Spawn moving block above
    setMoving({ id: 1, x: 0, dir: 1, width: BLOCK_W });
  }, [bet, balance, profile, isDemo, setShowAuthModal]);

  // ── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let frameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Background grid
      ctx.strokeStyle = "rgba(255,255,255,0.018)";
      ctx.lineWidth = 1;
      for (let y = 0; y < CANVAS_H; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }

      // ── Placed blocks ──────────────────────────────────────────────────
      const blocks = tower;
      for (let i = 0; i < blocks.length; i++) {
        const b  = blocks[i];
        const by = CANVAS_H - (i + 1) * (BLOCK_H + 6);
        const alpha = 0.5 + (i / blocks.length) * 0.5;

        ctx.save();
        ctx.shadowColor = b.color;
        ctx.shadowBlur  = 12;
        ctx.globalAlpha = alpha;

        const grad = ctx.createLinearGradient(b.x, by, b.x, by + BLOCK_H);
        grad.addColorStop(0, b.color + "ee");
        grad.addColorStop(1, b.color + "88");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(b.x, by, b.width, BLOCK_H, 6);
        ctx.fill();

        // shine
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.roundRect(b.x + 4, by + 4, b.width - 8, 8, 3);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.restore();

        // level label on top block
        if (i === blocks.length - 1) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 11px Orbitron,monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`LVL ${i + 1}`, b.x + b.width / 2, by + BLOCK_H / 2);
        }
      }

      // ── Moving block ───────────────────────────────────────────────────
      const m = movingRef.current;
      if (!m) { frameId = requestAnimationFrame(draw); return; }

      const topBlock = blocks[blocks.length - 1];
      const my = CANVAS_H - (blocks.length + 1) * (BLOCK_H + 6);
      const col = COLORS[blocks.length % COLORS.length];

      // Glow effect on moving block
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur  = 18;
      const mgrad = ctx.createLinearGradient(m.x, my, m.x, my + BLOCK_H);
      mgrad.addColorStop(0, col + "ff");
      mgrad.addColorStop(1, col + "aa");
      ctx.fillStyle = mgrad;
      ctx.beginPath();
      ctx.roundRect(m.x, my, m.width, BLOCK_H, 6);
      ctx.fill();

      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.roundRect(m.x + 4, my + 4, m.width - 8, 8, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Overlap indicator dashes
      if (topBlock) {
        const overlapLeft  = Math.max(m.x, topBlock.x);
        const overlapRight = Math.min(m.x + m.width, topBlock.x + topBlock.width);
        if (overlapRight > overlapLeft) {
          ctx.strokeStyle = "rgba(255,255,255,0.25)";
          ctx.lineWidth   = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.rect(overlapLeft, my - 2, overlapRight - overlapLeft, BLOCK_H + 4);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Move
      setMoving(prev => {
        if (!prev) return prev;
        let nx  = prev.x + prev.dir * speed;
        let ndir = prev.dir;
        if (nx <= 0)             { nx = 0;              ndir = 1; }
        if (nx + prev.width >= CANVAS_W) { nx = CANVAS_W - prev.width; ndir = -1; }
        return { ...prev, x: nx, dir: ndir };
      });

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [phase, tower, speed]);

  // ── Drop block ───────────────────────────────────────────────────────────
  const dropBlock = useCallback(async () => {
    if (phase !== "playing" || !moving) return;

    const topBlock = tower[tower.length - 1];
    const overlapLeft  = Math.max(moving.x, topBlock.x);
    const overlapRight = Math.min(moving.x + moving.width, topBlock.x + topBlock.width);
    const overlap      = overlapRight - overlapLeft;

    if (overlap <= 0) {
      // Missed completely → lose
      sfx.playLose();
      setPhase("lost");
      setMoving(null);
      cancelAnimationFrame(animRef.current);

      const mult = PAYOUTS[level - 1] ?? 0;
      const pnl  = mult > 0 ? parseFloat((bet * mult - bet).toFixed(6)) : -bet;
      setLastPnl(pnl);
      setHistory(h => [{ levels: level - 1, mult, pnl }, ...h.slice(0, 14)]);

      if (isDemo) demo.setDemoBalance(b => b + pnl);
      else {
        await supabase.functions.invoke("casino-play", {
          body: { game: "dice", bet_amount: bet, bet_type: `towers_lost_level${level}` },
        });
        await refreshProfile();
      }
      return;
    }

    sfx.playChipCollect();

    // Trim to overlap
    const newBlock: Block = {
      id:    moving.id,
      x:     overlapLeft,
      width: overlap,
      color: COLORS[(tower.length) % COLORS.length],
    };
    const newTower = [...tower, newBlock];
    setTower(newTower);

    const nextLevel = level + 1;
    setLevel(nextLevel);

    // Win condition: reached top
    if (nextLevel > MAX_LEVELS) {
      sfx.playWin();
      setPhase("won");
      setMoving(null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      const mult = PAYOUTS[MAX_LEVELS] ?? PAYOUTS[PAYOUTS.length - 1];
      const pnl  = parseFloat((bet * mult - bet).toFixed(6));
      setLastPnl(pnl);
      setHistory(h => [{ levels: MAX_LEVELS, mult, pnl }, ...h.slice(0, 14)]);

      if (isDemo) demo.setDemoBalance(b => b + pnl);
      else {
        await supabase.functions.invoke("casino-play", {
          body: { game: "dice", bet_amount: bet, bet_type: `towers_win_level${MAX_LEVELS}` },
        });
        await refreshProfile();
      }
      return;
    }

    // Speed up slightly
    setSpeed(s => Math.min(s + ACCEL, MAX_SPEED));

    // Spawn next moving block — same width as trimmed, starts from left
    setMoving({ id: moving.id + 1, x: 0, dir: 1, width: overlap });
  }, [phase, moving, tower, level, bet, isDemo, demo, sfx, refreshProfile]);

  // ── Cashout ─────────────────────────────────────────────────────────────
  const cashout = useCallback(async () => {
    if (phase !== "playing" || level < 2) return;
    sfx.playWin();
    setPhase("won");
    setMoving(null);

    const mult = PAYOUTS[level - 1] ?? 0;
    const pnl  = parseFloat((bet * mult - bet).toFixed(6));
    setLastPnl(pnl);
    setHistory(h => [{ levels: level - 1, mult, pnl }, ...h.slice(0, 14)]);

    if (mult > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }

    if (isDemo) demo.setDemoBalance(b => b + pnl);
    else {
      await supabase.functions.invoke("casino-play", {
        body: { game: "dice", bet_amount: bet, bet_type: `towers_cashout_level${level - 1}` },
      });
      await refreshProfile();
    }
  }, [phase, level, bet, isDemo, demo, sfx, refreshProfile]);

  const reset = () => {
    setPhase("idle");
    setTower([]);
    setMoving(null);
    setLevel(0);
    setLastPnl(null);
  };

  const currentMult = PAYOUTS[level - 1] ?? 0;
  const nextMult    = PAYOUTS[level] ?? 0;

  return (
    <div className="max-w-4xl mx-auto">
      {showConfetti && <Confetti intensity="epic" />}

      <div className="flex items-center gap-3 mb-5">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-sm">🏗️</div>
          <h1 className="text-lg font-display font-black tracking-widest text-white uppercase">Tower Build</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DemoToggle isDemo={isDemo} onToggle={setIsDemo} />
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-display">
            <span className="text-white/50 mr-1">◎</span>
            <span className="text-white font-bold">{balance.toFixed(4)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Tower canvas ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center">
          {/* Level progress bar */}
          {phase === "playing" && (
            <div className="w-full max-w-[340px] mb-3 flex items-center gap-2">
              <span className="text-xs font-display text-white/40">Lvl {level}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-amber-400"
                  animate={{ width: `${((level) / MAX_LEVELS) * 100}%` }}
                  transition={{ duration: 0.3 }} />
              </div>
              <span className="text-xs font-display text-amber-400">{MAX_LEVELS}</span>
            </div>
          )}

          {/* Canvas */}
          <div className="relative rounded-2xl overflow-hidden border border-white/8"
            style={{
              width: CANVAS_W, height: CANVAS_H,
              background: "radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.12) 0%, rgba(8,8,18,1) 70%)",
            }}>
            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
              className="absolute inset-0" />

            {/* Idle overlay */}
            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="text-6xl">🏗️</div>
                <div className="text-center">
                  <div className="text-white font-display font-black text-lg">TOWER BUILD</div>
                  <div className="text-white/40 text-xs font-display mt-1">Stack blocks to multiply your bet</div>
                </div>
                <div className="flex gap-3 flex-wrap justify-center px-6">
                  {PAYOUTS.slice(1, 7).map((p, i) => (
                    <div key={i} className="text-center">
                      <div className="text-amber-400 font-display font-black text-sm">{p}×</div>
                      <div className="text-white/30 text-[9px] font-display">lvl {i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* End overlay */}
            <AnimatePresence>
              {(phase === "won" || phase === "lost") && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                  style={{ background: "rgba(8,8,18,0.88)" }}>
                  <div className="text-5xl">{phase === "won" ? "🏆" : "💥"}</div>
                  <div className={`text-2xl font-display font-black ${phase === "won" ? "text-amber-400" : "text-red-400"}`}>
                    {phase === "won" ? "PARFAIT!" : "MANQUÉ!"}
                  </div>
                  {lastPnl !== null && (
                    <div className={`text-lg font-display font-black ${lastPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {lastPnl >= 0 ? "+" : ""}{lastPnl.toFixed(4)} SOL
                    </div>
                  )}
                  <div className="text-white/40 text-xs font-display">{tower.length} blocs empilés</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* TAP / DROP instruction */}
          {phase === "playing" && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="mt-3 text-xs font-display tracking-[0.3em] text-white/30 uppercase">
              ← APPUYER POUR POSER →
            </motion.div>
          )}
        </div>

        {/* ── Controls ─────────────────────────────────────────────────────── */}
        <div className="w-full lg:w-[240px] shrink-0 space-y-3">
          {/* Bet */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
            <label className="text-[9px] tracking-[0.2em] text-white/40 uppercase font-display block">Mise</label>
            <div className="flex gap-1.5">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 text-xs">◎</span>
                <input type="number" value={betInput} onChange={e => setBetInput(e.target.value)}
                  disabled={phase === "playing"}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-8 pr-3 text-sm font-display text-white focus:border-amber-500/50 outline-none disabled:opacity-40" />
              </div>
              <button onClick={() => setBetInput(Math.max(0.001, bet/2).toFixed(4))} disabled={phase === "playing"}
                className="px-2.5 py-2 rounded-lg text-[10px] font-display bg-white/5 border border-white/8 text-white/50 disabled:opacity-30">½</button>
              <button onClick={() => setBetInput(Math.min(bet*2, balance).toFixed(4))} disabled={phase === "playing"}
                className="px-2.5 py-2 rounded-lg text-[10px] font-display bg-white/5 border border-white/8 text-white/50 disabled:opacity-30">2×</button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[0.01, 0.05, 0.1, 0.5].map(b => (
                <button key={b} onClick={() => setBetInput(b.toString())} disabled={phase === "playing"}
                  className={`py-1.5 rounded text-[10px] font-display transition-all disabled:opacity-30 ${
                    bet === b ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-white/5 text-white/50 border border-white/8 hover:text-white"}`}>{b}</button>
              ))}
            </div>
          </div>

          {/* Multiplier display */}
          {phase === "playing" && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
              <div className="flex justify-between text-xs font-display text-white/40">
                <span>Actuel</span>
                <span>Prochain</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-2xl font-display font-black text-emerald-400">
                  {currentMult > 0 ? `${currentMult}×` : "—"}
                </div>
                <div className="text-sm font-display text-white/30">→</div>
                <div className="text-xl font-display font-black text-amber-400">{nextMult}×</div>
              </div>
              <div className="text-[10px] text-white/25 font-display">
                {currentMult > 0 ? `Gain actuel: ${(bet * currentMult - bet).toFixed(4)} SOL` : "Pose un bloc pour débloquer"}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {phase === "idle" && (
            <motion.button onClick={startGame} disabled={bet <= 0 || bet > balance}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-xl text-sm font-display font-black tracking-[0.2em] uppercase text-black disabled:opacity-30"
              style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
              🏗️ CONSTRUIRE
            </motion.button>
          )}

          {phase === "playing" && (
            <div className="space-y-2">
              <motion.button onClick={dropBlock}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                className="w-full py-4 rounded-xl text-base font-display font-black tracking-[0.2em] uppercase text-black"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 0 20px rgba(245,158,11,0.4)" }}>
                ⬇ POSER
              </motion.button>
              {level >= 2 && (
                <motion.button onClick={cashout}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                  className="w-full py-3 rounded-xl text-sm font-display font-bold tracking-[0.15em] uppercase border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  💰 ENCAISSER {currentMult}×
                </motion.button>
              )}
            </div>
          )}

          {(phase === "won" || phase === "lost") && (
            <motion.button onClick={reset}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-xl text-sm font-display font-black tracking-[0.2em] uppercase text-black"
              style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
              ↺ REJOUER
            </motion.button>
          )}

          {/* Payout table */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-3">
            <label className="text-[9px] tracking-[0.2em] text-white/30 uppercase font-display block mb-2">Récompenses</label>
            <div className="grid grid-cols-2 gap-1">
              {PAYOUTS.slice(1).map((p, i) => (
                <div key={i} className={`flex justify-between px-2 py-1 rounded text-[10px] transition-all ${
                  level === i + 1 && phase === "playing"
                    ? "bg-amber-500/15 border border-amber-500/30"
                    : "text-white/30"
                }`}>
                  <span className="font-display">Lvl {i + 1}</span>
                  <span className={`font-display font-bold ${p >= 20 ? "text-amber-400" : p >= 5 ? "text-purple-400" : "text-white/50"}`}>{p}×</span>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-1">
              <label className="text-[9px] tracking-[0.2em] text-white/25 uppercase font-display block">Récent</label>
              {history.slice(0, 4).map((h, i) => (
                <div key={i} className={`flex justify-between text-[10px] px-2 py-1.5 rounded border ${
                  h.pnl > 0 ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-400"
                  : "bg-red-500/5 border-red-500/10 text-red-400"}`}>
                  <span className="font-body">{h.levels} blocs</span>
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

export default TowersPage;
