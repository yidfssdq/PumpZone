import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useBeta } from "@/contexts/BetaContext";
import { useAuth } from "@/contexts/AuthContext";
import DemoToggle from "@/components/casino/DemoToggle";
import Confetti from "@/components/casino/Confetti";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";

const CoinflipPage = () => {
  const { isBeta } = useBeta();
  const { profile } = useAuth();
  const { playClick, playWin, playLose } = useCasinoSfx();

  const [isDemo, setIsDemo] = useState(true);
  const effectiveDemo = isBeta || isDemo;

  const [demoBalance, setDemoBalance] = useState(100);
  const [bet, setBet] = useState(0.1);
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [lastWin, setLastWin] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [flipRotation, setFlipRotation] = useState(0);

  const balance = effectiveDemo ? demoBalance : 0;

  const flip = useCallback(() => {
    if (bet > balance || bet <= 0 || flipping) return;
    playClick();
    setFlipping(true);
    setShowConfetti(false);
    setLastWin(null);

    if (effectiveDemo) setDemoBalance(prev => prev - bet);

    const res: "heads" | "tails" = Math.random() > 0.5 ? "heads" : "tails";
    setFlipRotation(prev => prev + 1440 + (res === "heads" ? 0 : 180));

    setTimeout(() => {
      setResult(res);
      const win = res === choice;
      setLastWin(win);

      if (effectiveDemo && win) setDemoBalance(prev => prev + bet * 1.98);

      if (win) { playWin(); setShowConfetti(true); } else playLose();
      setFlipping(false);
    }, 1500);
  }, [bet, balance, flipping, choice, effectiveDemo, playClick, playWin, playLose]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {showConfetti && <Confetti intensity="normal" />}

      <div className="flex items-center gap-3">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-lg font-display font-bold">🪙 Coinflip</h1>
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

      <div className="glass-card p-8 space-y-8">
        <div className="flex justify-center">
          <motion.div
            animate={{ rotateX: flipRotation }}
            transition={{ duration: 1.5, ease: [0.17, 0.67, 0.12, 0.99] }}
            className="w-32 h-32 rounded-full border-4 border-primary/30 bg-gradient-to-br from-warning/80 to-warning flex items-center justify-center text-5xl font-display font-black shadow-2xl">
            {result === "tails" ? "T" : "H"}
          </motion.div>
        </div>

        {lastWin !== null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`text-center py-3 rounded-xl font-display font-bold ${lastWin ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {lastWin ? `WIN! +${(bet * 0.98).toFixed(4)} SOL` : `LOSE -${bet.toFixed(4)} SOL`}
          </motion.div>
        )}

        <div className="flex gap-3 justify-center">
          <button onClick={() => setChoice("heads")}
            className={`px-8 py-3 rounded-xl font-display font-bold text-sm transition-all ${choice === "heads" ? "bg-primary/15 text-primary border-2 border-primary/30" : "bg-muted text-muted-foreground border-2 border-border"}`}>Heads</button>
          <button onClick={() => setChoice("tails")}
            className={`px-8 py-3 rounded-xl font-display font-bold text-sm transition-all ${choice === "tails" ? "bg-primary/15 text-primary border-2 border-primary/30" : "bg-muted text-muted-foreground border-2 border-border"}`}>Tails</button>
        </div>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <input type="number" value={bet} onChange={e => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-24 bg-muted border border-border rounded-lg px-3 py-2 text-sm font-display focus:ring-1 focus:ring-primary outline-none" step={0.01} min={0.01} />
          <motion.button whileTap={{ scale: 0.95 }} onClick={flip}
            disabled={bet > balance || bet <= 0 || flipping}
            className="px-10 py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 disabled:opacity-40">
            {flipping ? "Flipping..." : "FLIP"}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default CoinflipPage;
