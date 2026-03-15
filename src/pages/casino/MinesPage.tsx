import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bomb, Diamond } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBeta } from "@/contexts/BetaContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCasinoPlay } from "@/hooks/useCasinoPlay";
import DemoToggle from "@/components/casino/DemoToggle";
import Confetti from "@/components/casino/Confetti";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";
import { calculateMultiplier } from "@/lib/mines";

type TileState = "hidden" | "diamond" | "mine";

const MinesPage = () => {
  const { isBeta } = useBeta();
  const { profile, setShowAuthModal } = useAuth();
  const casino = useCasinoPlay();
  const { playClick, playWin, playLose, playReveal } = useCasinoSfx();

  const [isDemo, setIsDemo] = useState(true);
  const effectiveDemo = isBeta || isDemo;
  const [demoBalance, setDemoBalance] = useState(100);
  const [bet, setBet] = useState(0.1);
  const [mineCount, setMineCount] = useState(5);
  const [gameActive, setGameActive] = useState(false);
  const [tiles, setTiles] = useState<TileState[]>(Array(25).fill("hidden"));
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set());
  const [revealedCount, setRevealedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lastPnl, setLastPnl] = useState<number | null>(null);

  const balance = effectiveDemo ? demoBalance : (casino.balance ?? 0);
  const currentMultiplier = calculateMultiplier(revealedCount, mineCount);
  const nextMultiplier = calculateMultiplier(revealedCount + 1, mineCount);

  const startGame = useCallback(() => {
    if (bet > balance || bet <= 0) return;
    playClick();
    const mines = new Set<number>();
    while (mines.size < mineCount) mines.add(Math.floor(Math.random() * 25));
    if (effectiveDemo) setDemoBalance(p => p - bet);
    setMinePositions(mines);
    setTiles(Array(25).fill("hidden"));
    setRevealedCount(0);
    setGameActive(true);
    setGameOver(false);
    setLastPnl(null);
    setShowConfetti(false);
  }, [bet, balance, mineCount, effectiveDemo, playClick]);

  const revealTile = useCallback((index: number) => {
    if (!gameActive || gameOver || tiles[index] !== "hidden") return;
    const newTiles = [...tiles];
    if (minePositions.has(index)) {
      newTiles[index] = "mine";
      minePositions.forEach(pos => { newTiles[pos] = "mine"; });
      setTiles(newTiles);
      setGameOver(true);
      setGameActive(false);
      setLastPnl(-bet);
      playLose();
    } else {
      newTiles[index] = "diamond";
      setTiles(newTiles);
      const newCount = revealedCount + 1;
      setRevealedCount(newCount);
      playReveal();
      const safeTiles = 25 - mineCount;
      if (newCount >= safeTiles) {
        const mult = calculateMultiplier(newCount, mineCount);
        const pnl = bet * mult - bet;
        setLastPnl(pnl);
        if (effectiveDemo) setDemoBalance(p => p + bet * mult);
        setGameActive(false);
        setGameOver(true);
        setShowConfetti(true);
        playWin();
      }
    }
  }, [gameActive, gameOver, tiles, minePositions, bet, revealedCount, mineCount, effectiveDemo, playReveal, playWin, playLose]);

  const cashOut = useCallback(() => {
    if (!gameActive || revealedCount === 0) return;
    const pnl = bet * currentMultiplier - bet;
    if (effectiveDemo) setDemoBalance(p => p + bet * currentMultiplier);
    if (!effectiveDemo) casino.play("mines", bet);
    setLastPnl(pnl);
    setGameActive(false);
    setGameOver(true);
    if (pnl > 0) { setShowConfetti(true); playWin(); } else playLose();
    // Reveal all mines
    setTiles(prev => prev.map((t, i) => (t === "hidden" && minePositions.has(i)) ? "mine" : t));
  }, [gameActive, revealedCount, bet, currentMultiplier, effectiveDemo, minePositions, casino, playWin, playLose]);

  const safeTilesLeft = 25 - mineCount - revealedCount;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {showConfetti && <Confetti intensity="epic" />}

      <div className="flex items-center gap-3">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-4 h-4"/></Link>
        <h1 className="text-lg font-display font-bold gradient-text">Mines</h1>
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

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Controls */}
        <div className="lg:w-[260px] shrink-0 space-y-3">
          <div className="glass-card p-4 space-y-4">
            {/* Bet */}
            <div>
              <label className="text-[11px] text-muted-foreground font-body uppercase tracking-wider mb-1.5 block">Bet (SOL)</label>
              <input type="number" value={bet} onChange={e => setBet(Math.max(0, parseFloat(e.target.value)||0))}
                disabled={gameActive}
                className="input-game w-full disabled:opacity-50"
                step={0.01} min={0.01}/>
              <div className="flex gap-1.5 mt-2">
                {[0.01,0.05,0.1,0.5,1].map(v=>(
                  <button key={v} onClick={()=>!gameActive&&setBet(v)} disabled={gameActive}
                    className="flex-1 py-1 text-[10px] font-body rounded bg-muted hover:bg-primary/15 transition-colors disabled:opacity-40">{v}</button>
                ))}
              </div>
            </div>

            {/* Mine count */}
            <div>
              <label className="text-[11px] text-muted-foreground font-body uppercase tracking-wider mb-1.5 block">
                Mines — <span className="text-primary">{mineCount}</span>
              </label>
              <input type="range" min={1} max={24} value={mineCount}
                onChange={e => !gameActive && setMineCount(+e.target.value)}
                disabled={gameActive}
                className="w-full accent-primary disabled:opacity-50"/>
              <div className="flex justify-between text-[9px] text-muted-foreground font-body mt-0.5">
                <span>1</span><span>12</span><span>24</span>
              </div>
            </div>

            {/* Quick mine presets */}
            <div className="flex gap-1.5">
              {[3,5,10,15,24].map(n=>(
                <button key={n} onClick={()=>!gameActive&&setMineCount(n)} disabled={gameActive}
                  className={`flex-1 py-1.5 rounded text-[10px] font-display font-700 transition-all disabled:opacity-40 ${
                    mineCount===n ? "bg-destructive/20 border border-destructive/40 text-destructive" : "bg-muted border border-border text-muted-foreground hover:border-destructive/30"
                  }`}>{n}</button>
              ))}
            </div>

            {/* Stats */}
            {gameActive && (
              <div className="rounded-lg p-3 space-y-2" style={{ background: "hsl(240 20% 9%)", border: "1px solid hsl(240 15% 15%)" }}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-body">Current mult</span>
                  <span className="font-display font-700 text-primary">{currentMultiplier.toFixed(2)}×</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-body">Next tile</span>
                  <span className="font-display font-700 text-success">{nextMultiplier.toFixed(2)}×</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-body">Safe left</span>
                  <span className="font-display font-700 text-foreground">{safeTilesLeft}</span>
                </div>
                <div className="neon-divider"/>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-body">Cashout now</span>
                  <span className="font-display font-700 text-success">+{(bet * currentMultiplier - bet).toFixed(4)}</span>
                </div>
              </div>
            )}

            {/* Buttons */}
            {!gameActive ? (
              <button onClick={startGame} disabled={bet > balance || bet <= 0} className="btn-bet">
                START GAME
              </button>
            ) : (
              <button onClick={cashOut} disabled={revealedCount === 0}
                className="w-full py-3.5 rounded-lg font-display font-bold text-sm tracking-wider text-white transition-all disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, hsl(142 70% 35%), hsl(160 80% 42%))",
                  boxShadow: "0 4px 20px hsl(142 70% 35% / 0.4)",
                }}>
                CASH OUT {revealedCount > 0 ? `(${(bet * currentMultiplier).toFixed(4)} SOL)` : ""}
              </button>
            )}

            {/* Result */}
            <AnimatePresence>
              {lastPnl !== null && !gameActive && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                  className={`p-3 rounded-lg text-center border ${
                    lastPnl >= 0 ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"
                  }`}>
                  <p className={`font-display font-bold text-sm ${lastPnl >= 0 ? "text-success" : "text-destructive"}`}>
                    {lastPnl >= 0 ? `+${lastPnl.toFixed(4)} SOL 💎` : `${lastPnl.toFixed(4)} SOL 💥`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 glass-card p-4 sm:p-6">
          <div className="grid grid-cols-5 gap-2 sm:gap-2.5 max-w-[420px] mx-auto">
            {tiles.map((tile, i) => (
              <motion.button
                key={i}
                onClick={() => revealTile(i)}
                disabled={!gameActive || tile !== "hidden"}
                className={`aspect-square rounded-xl flex items-center justify-center tile-base relative overflow-hidden ${
                  tile === "hidden"
                    ? gameActive
                      ? "cursor-pointer hover:border-primary/50 hover:bg-primary/10"
                      : "cursor-default opacity-60"
                    : "cursor-default"
                }`}
                style={{
                  background: tile === "hidden"
                    ? "hsl(240 20% 9%)"
                    : tile === "diamond"
                    ? "hsl(220 70% 15%)"
                    : "hsl(0 60% 12%)",
                  border: tile === "hidden"
                    ? "1px solid hsl(240 15% 16%)"
                    : tile === "diamond"
                    ? "1px solid hsl(220 80% 40% / 0.5)"
                    : "1px solid hsl(0 70% 40% / 0.5)",
                  boxShadow: tile === "diamond"
                    ? "0 0 12px hsl(220 80% 50% / 0.3), inset 0 0 8px hsl(220 80% 50% / 0.1)"
                    : tile === "mine"
                    ? "0 0 12px hsl(0 70% 50% / 0.3), inset 0 0 8px hsl(0 70% 50% / 0.1)"
                    : undefined,
                }}>
                {tile === "hidden" && gameActive && (
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: "radial-gradient(circle at center, hsl(270 85% 62% / 0.15), transparent 70%)" }}/>
                )}
                <AnimatePresence>
                  {tile === "diamond" && (
                    <motion.div key="diamond" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7 sm:w-8 sm:h-8">
                        <path d="M16 3 L29 12 L16 29 L3 12Z" fill="hsl(217,91%,60%)" opacity="0.9"/>
                        <path d="M16 8 L24 14 L16 24 L8 14Z" fill="hsl(217,91%,80%)" opacity="0.6"/>
                        <path d="M16 3 L10 12 L16 12Z" fill="white" opacity="0.2"/>
                      </svg>
                    </motion.div>
                  )}
                  {tile === "mine" && (
                    <motion.div key="mine" initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 600, damping: 20 }}>
                      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7 sm:w-8 sm:h-8">
                        <circle cx="16" cy="16" r="7" fill="hsl(0,84%,55%)"/>
                        {[0,45,90,135,180,225,270,315].map((a,ii)=>(
                          <line key={ii}
                            x1={16+9.5*Math.cos(a*Math.PI/180)} y1={16+9.5*Math.sin(a*Math.PI/180)}
                            x2={16+13*Math.cos(a*Math.PI/180)} y2={16+13*Math.sin(a*Math.PI/180)}
                            stroke="hsl(0,84%,55%)" strokeWidth="2" strokeLinecap="round"/>
                        ))}
                        <circle cx="16" cy="16" r="3" fill="hsl(0,0%,80%)" opacity="0.4"/>
                      </svg>
                    </motion.div>
                  )}
                  {tile === "hidden" && (
                    <motion.div key="hidden" className="w-2 h-2 rounded-full bg-white/10"/>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>

          {/* Mine indicators below grid */}
          <div className="flex items-center justify-center gap-3 mt-5 text-xs font-body text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(220 70% 15%)", border: "1px solid hsl(220 80% 40% / 0.5)" }}/>
              <span>Diamond</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(0 60% 12%)", border: "1px solid hsl(0 70% 40% / 0.5)" }}/>
              <span>Mine × {mineCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinesPage;
