import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronUp, ChevronDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBeta } from "@/contexts/BetaContext";
import { useAuth } from "@/contexts/AuthContext";
import DemoToggle from "@/components/casino/DemoToggle";
import Confetti from "@/components/casino/Confetti";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
const RANK_VALUES: Record<string, number> = {};
RANKS.forEach((r, i) => { RANK_VALUES[r] = i + 2; });

interface Card { rank: string; suit: string; value: number; id: number }
let cardId = 0;
const randomCard = (): Card => {
  const rank = RANKS[Math.floor(Math.random() * 13)];
  const suit = SUITS[Math.floor(Math.random() * 4)];
  return { rank, suit, value: RANK_VALUES[rank], id: ++cardId };
};

const isRedSuit = (suit: string) => suit === "♥" || suit === "♦";

const CardView = ({ card, delay = 0 }: { card: Card; delay?: number }) => (
  <motion.div
    initial={{ y: -50, opacity: 0, rotateY: 180 }}
    animate={{ y: 0, opacity: 1, rotateY: 0 }}
    transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
    className="w-20 h-28 rounded-xl border-2 border-border bg-card flex flex-col items-center justify-center font-display font-bold text-lg shadow-lg"
  >
    <span className={isRedSuit(card.suit) ? "text-red-400" : "text-foreground"}>{card.rank}</span>
    <span className={`text-2xl ${isRedSuit(card.suit) ? "text-red-400" : "text-foreground"}`}>{card.suit}</span>
  </motion.div>
);

const HiLoPage = () => {
  const { isBeta } = useBeta();
  const { profile } = useAuth();
  const { playClick, playWin, playLose, playCardFlip } = useCasinoSfx();

  const [isDemo, setIsDemo] = useState(true);
  const effectiveDemo = isBeta || isDemo;

  const [demoBalance, setDemoBalance] = useState(100);
  const [bet, setBet] = useState(0.1);
  const [gameActive, setGameActive] = useState(false);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [streak, setStreak] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [lastGuess, setLastGuess] = useState<"higher" | "lower" | "equal" | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [history, setHistory] = useState<Card[]>([]);

  const balance = effectiveDemo ? demoBalance : 0;

  const startGame = useCallback(() => {
    if (bet > balance || bet <= 0) return;
    if (effectiveDemo) setDemoBalance(prev => prev - bet);
    playClick();

    const card = randomCard();
    setCurrentCard(card);
    setNextCard(null);
    setGameActive(true);
    setStreak(0);
    setCurrentMultiplier(1);
    setLastGuess(null);
    setLastCorrect(null);
    setShowConfetti(false);
    setHistory([card]);
  }, [bet, balance, effectiveDemo, playClick]);

  const guess = useCallback((type: "higher" | "lower" | "equal") => {
    if (!gameActive || !currentCard) return;
    playCardFlip();

    const next = randomCard();
    setNextCard(next);
    setLastGuess(type);

    const isCorrect =
      type === "higher" ? next.value > currentCard.value :
      type === "lower" ? next.value < currentCard.value :
      next.value === currentCard.value;

    setLastCorrect(isCorrect);

    if (isCorrect) {
      const cardsHigher = 14 - currentCard.value;
      const cardsLower = currentCard.value - 2;
      const mult = type === "higher" ? (13 / Math.max(cardsHigher, 1)) * 0.97 :
                   type === "lower" ? (13 / Math.max(cardsLower, 1)) * 0.97 :
                   13 * 0.97;
      const newMult = parseFloat((currentMultiplier * mult).toFixed(2));
      setCurrentMultiplier(newMult);
      setStreak(prev => prev + 1);
      playWin();

      setTimeout(() => {
        setCurrentCard(next);
        setNextCard(null);
        setLastGuess(null);
        setLastCorrect(null);
        setHistory(prev => [...prev, next].slice(-10));
      }, 1000);
    } else {
      setGameActive(false);
      playLose();
      setHistory(prev => [...prev, next].slice(-10));
    }
  }, [gameActive, currentCard, currentMultiplier, playCardFlip, playWin, playLose]);

  const cashout = useCallback(() => {
    if (!gameActive || streak === 0) return;
    const payout = bet * currentMultiplier;
    if (effectiveDemo) setDemoBalance(prev => prev + payout);
    setGameActive(false);
    setShowConfetti(true);
    playWin();
  }, [gameActive, streak, bet, currentMultiplier, effectiveDemo, playWin]);

  const higherChance = currentCard ? ((14 - currentCard.value) / 13 * 100).toFixed(0) : "0";
  const lowerChance = currentCard ? ((currentCard.value - 2) / 13 * 100).toFixed(0) : "0";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {showConfetti && <Confetti intensity="epic" />}

      <div className="flex items-center gap-3">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-lg font-display font-bold">🂡 Hi-Lo</h1>
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

      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-center gap-8 min-h-[200px]">
          {currentCard && <CardView card={currentCard} />}
          {nextCard && <CardView card={nextCard} delay={0.2} />}
          {!currentCard && (
            <div className="text-center">
              <span className="text-6xl">🂡</span>
              <p className="text-sm text-muted-foreground font-body mt-2">Place your bet to start</p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {lastCorrect !== null && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className={`text-center py-2 rounded-lg font-display font-bold ${lastCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {lastCorrect ? `CORRECT! Streak: ${streak + 1}` : "WRONG! Game Over"}
            </motion.div>
          )}
        </AnimatePresence>

        {gameActive && (
          <div className="flex justify-center gap-4">
            <div className="text-center"><p className="text-[9px] text-muted-foreground font-body uppercase">Streak</p><p className="text-lg font-display font-bold text-primary">{streak}</p></div>
            <div className="text-center"><p className="text-[9px] text-muted-foreground font-body uppercase">Multiplier</p><p className="text-lg font-display font-bold text-success">{currentMultiplier.toFixed(2)}×</p></div>
            <div className="text-center"><p className="text-[9px] text-muted-foreground font-body uppercase">Payout</p><p className="text-lg font-display font-bold text-warning">{(bet * currentMultiplier).toFixed(4)}</p></div>
          </div>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          {!gameActive ? (
            <>
              <input type="number" value={bet} onChange={e => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 bg-muted border border-border rounded-lg px-3 py-2 text-sm font-display focus:ring-1 focus:ring-primary outline-none" step={0.01} min={0.01} />
              <motion.button whileTap={{ scale: 0.95 }} onClick={startGame} disabled={bet > balance || bet <= 0}
                className="px-8 py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 disabled:opacity-40">Start</motion.button>
            </>
          ) : (
            <>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => guess("higher")} disabled={lastCorrect !== null}
                className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-success/20 text-success border border-success/30 hover:bg-success/30 disabled:opacity-40 flex items-center gap-1">
                <ChevronUp className="w-4 h-4" /> Higher ({higherChance}%)
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => guess("equal")} disabled={lastCorrect !== null}
                className="px-4 py-3 rounded-xl font-display font-bold text-sm bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30 disabled:opacity-40 flex items-center gap-1">
                <Minus className="w-4 h-4" /> Equal
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => guess("lower")} disabled={lastCorrect !== null}
                className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 disabled:opacity-40 flex items-center gap-1">
                <ChevronDown className="w-4 h-4" /> Lower ({lowerChance}%)
              </motion.button>
              {streak > 0 && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={cashout}
                  className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-success to-emerald-600 text-white hover:opacity-90">
                  Cashout {(bet * currentMultiplier).toFixed(4)} SOL
                </motion.button>
              )}
            </>
          )}
        </div>

        <div className="flex gap-1.5 justify-center">
          {history.slice(-8).map((c, i) => (
            <span key={i} className={`text-xs px-2 py-1 rounded bg-muted font-display ${isRedSuit(c.suit) ? "text-red-400" : "text-foreground"}`}>
              {c.rank}{c.suit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HiLoPage;
