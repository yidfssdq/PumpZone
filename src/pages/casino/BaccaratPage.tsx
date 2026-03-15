import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBeta } from "@/contexts/BetaContext";
import { useAuth } from "@/contexts/AuthContext";
import DemoToggle from "@/components/casino/DemoToggle";
import Confetti from "@/components/casino/Confetti";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

interface Card { rank: string; suit: string; value: number; id: number }
let cardId = 0;

const cardValue = (rank: string): number => {
  if (rank === "A") return 1;
  const n = parseInt(rank);
  if (!isNaN(n) && n <= 9) return n;
  return 0; // 10, J, Q, K
};

const randomCard = (): Card => {
  const rank = RANKS[Math.floor(Math.random() * 13)];
  const suit = SUITS[Math.floor(Math.random() * 4)];
  return { rank, suit, value: cardValue(rank), id: ++cardId };
};

const handTotal = (cards: Card[]): number => cards.reduce((s, c) => s + c.value, 0) % 10;

const isRed = (suit: string) => suit === "♥" || suit === "♦";

const CardView = ({ card, delay = 0 }: { card: Card; delay?: number }) => (
  <motion.div
    initial={{ x: 80, opacity: 0, rotateY: 180 }}
    animate={{ x: 0, opacity: 1, rotateY: 0 }}
    transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
    className="w-16 h-24 rounded-xl border-2 border-border bg-card flex flex-col items-center justify-center font-display font-bold text-lg shadow-lg"
  >
    <span className={isRed(card.suit) ? "text-red-400" : "text-foreground"}>{card.rank}</span>
    <span className={`text-xl ${isRed(card.suit) ? "text-red-400" : "text-foreground"}`}>{card.suit}</span>
  </motion.div>
);

type BetSide = "player" | "banker" | "tie";

const BaccaratPage = () => {
  const { isBeta } = useBeta();
  const { profile } = useAuth();
  const { playClick, playDeal, playWin, playLose } = useCasinoSfx();

  const [isDemo, setIsDemo] = useState(true);
  const effectiveDemo = isBeta || isDemo;

  const [demoBalance, setDemoBalance] = useState(100);
  const [bet, setBet] = useState(0.1);
  const [betSide, setBetSide] = useState<BetSide>("player");
  const [dealing, setDealing] = useState(false);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [winner, setWinner] = useState<BetSide | null>(null);
  const [lastPnl, setLastPnl] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [history, setHistory] = useState<BetSide[]>([]);

  const balance = effectiveDemo ? demoBalance : 0;

  const deal = useCallback(async () => {
    if (bet > balance || bet <= 0 || dealing) return;
    playClick();
    setDealing(true);
    setShowConfetti(false);
    setWinner(null);
    setLastPnl(null);

    if (effectiveDemo) setDemoBalance(prev => prev - bet);

    // Deal initial 4 cards
    const p1 = randomCard(), b1 = randomCard(), p2 = randomCard(), b2 = randomCard();
    const pCards = [p1, p2];
    const bCards = [b1, b2];

    setPlayerCards([]);
    setBankerCards([]);

    // Animate dealing
    await new Promise(r => setTimeout(r, 300));
    setPlayerCards([p1]);
    playDeal();
    await new Promise(r => setTimeout(r, 300));
    setBankerCards([b1]);
    playDeal();
    await new Promise(r => setTimeout(r, 300));
    setPlayerCards([p1, p2]);
    playDeal();
    await new Promise(r => setTimeout(r, 300));
    setBankerCards([b1, b2]);
    playDeal();
    await new Promise(r => setTimeout(r, 400));

    let pTotal = handTotal(pCards);
    let bTotal = handTotal(bCards);

    // Natural check (8 or 9)
    if (pTotal < 8 && bTotal < 8) {
      // Player third card rule
      let playerThird: Card | null = null;
      if (pTotal <= 5) {
        playerThird = randomCard();
        pCards.push(playerThird);
        setPlayerCards([...pCards]);
        playDeal();
        await new Promise(r => setTimeout(r, 400));
        pTotal = handTotal(pCards);
      }

      // Banker third card rule
      if (playerThird === null) {
        // Player stood, banker draws on 0-5
        if (bTotal <= 5) {
          bCards.push(randomCard());
          setBankerCards([...bCards]);
          playDeal();
          await new Promise(r => setTimeout(r, 400));
        }
      } else {
        const ptv = playerThird.value;
        let bankerDraws = false;
        if (bTotal <= 2) bankerDraws = true;
        else if (bTotal === 3 && ptv !== 8) bankerDraws = true;
        else if (bTotal === 4 && [2, 3, 4, 5, 6, 7].includes(ptv)) bankerDraws = true;
        else if (bTotal === 5 && [4, 5, 6, 7].includes(ptv)) bankerDraws = true;
        else if (bTotal === 6 && [6, 7].includes(ptv)) bankerDraws = true;

        if (bankerDraws) {
          bCards.push(randomCard());
          setBankerCards([...bCards]);
          playDeal();
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }

    pTotal = handTotal(pCards);
    bTotal = handTotal(bCards);

    // Determine winner
    const result: BetSide = pTotal > bTotal ? "player" : bTotal > pTotal ? "banker" : "tie";
    setWinner(result);
    setHistory(prev => [result, ...prev].slice(0, 20));

    // Calculate pnl
    let pnl = -bet;
    if (result === betSide) {
      if (betSide === "player") pnl = bet;
      else if (betSide === "banker") pnl = bet * 0.95; // 5% commission
      else if (betSide === "tie") pnl = bet * 8;
    }

    setLastPnl(pnl);
    if (effectiveDemo && pnl > 0) setDemoBalance(prev => prev + bet + pnl);
    else if (effectiveDemo && pnl === 0) setDemoBalance(prev => prev + bet);

    if (pnl > 0) { playWin(); setShowConfetti(true); } else playLose();
    setDealing(false);
  }, [bet, balance, dealing, betSide, effectiveDemo, playClick, playDeal, playWin, playLose]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {showConfetti && <Confetti intensity="epic" />}

      <div className="flex items-center gap-3">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-display font-bold">🎴 Baccarat</h1>
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
        {/* Table */}
        <div className="grid grid-cols-2 gap-8">
          {/* Player */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className={`text-sm font-display font-bold uppercase ${winner === "player" ? "text-blue-400" : "text-muted-foreground"}`}>
                Player
              </span>
              {playerCards.length > 0 && (
                <span className="text-lg font-display font-black text-foreground">{handTotal(playerCards)}</span>
              )}
            </div>
            <div className="flex gap-2 justify-center min-h-[96px]">
              <AnimatePresence>
                {playerCards.map((c, i) => <CardView key={c.id} card={c} delay={i * 0.1} />)}
              </AnimatePresence>
            </div>
          </div>

          {/* Banker */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className={`text-sm font-display font-bold uppercase ${winner === "banker" ? "text-red-400" : "text-muted-foreground"}`}>
                Banker
              </span>
              {bankerCards.length > 0 && (
                <span className="text-lg font-display font-black text-foreground">{handTotal(bankerCards)}</span>
              )}
            </div>
            <div className="flex gap-2 justify-center min-h-[96px]">
              <AnimatePresence>
                {bankerCards.map((c, i) => <CardView key={c.id} card={c} delay={i * 0.1} />)}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Result */}
        <AnimatePresence>
          {winner && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className={`text-center py-3 rounded-xl font-display font-bold text-lg ${
                lastPnl !== null && lastPnl > 0 ? "bg-success/10 text-success" :
                lastPnl === 0 ? "bg-muted text-foreground" : "bg-destructive/10 text-destructive"
              }`}>
              {winner === "tie" ? "TIE!" : `${winner.toUpperCase()} WINS!`}
              {lastPnl !== null && (
                <span className="block text-sm mt-1">
                  {lastPnl >= 0 ? "+" : ""}{lastPnl.toFixed(4)} SOL
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bet selection */}
        <div className="flex gap-3 justify-center">
          {[
            { side: "player" as BetSide, label: "Player", mult: "1:1", color: "blue" },
            { side: "tie" as BetSide, label: "Tie", mult: "8:1", color: "green" },
            { side: "banker" as BetSide, label: "Banker", mult: "0.95:1", color: "red" },
          ].map(b => (
            <button key={b.side} onClick={() => !dealing && setBetSide(b.side)}
              className={`px-6 py-3 rounded-xl text-sm font-display font-bold border transition-all ${
                betSide === b.side
                  ? b.color === "blue" ? "border-blue-400 bg-blue-500/15 text-blue-400" :
                    b.color === "green" ? "border-green-400 bg-green-500/15 text-green-400" :
                    "border-red-400 bg-red-500/15 text-red-400"
                  : "border-border bg-muted text-muted-foreground hover:border-primary/20"
              }`}>
              {b.label}
              <span className="block text-[9px] opacity-60 mt-0.5">{b.mult}</span>
            </button>
          ))}
        </div>

        {/* Bet amount + deal */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <input type="number" value={bet} onChange={e => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-24 bg-muted border border-border rounded-lg px-3 py-2 text-sm font-display focus:ring-1 focus:ring-primary outline-none"
            step={0.01} min={0.01} disabled={dealing} />
          <div className="flex gap-1.5">
            {[0.01, 0.05, 0.1, 0.5].map(v => (
              <button key={v} onClick={() => !dealing && setBet(v)}
                className="px-3 py-2 text-[10px] font-body rounded-md bg-muted hover:bg-primary/10 transition-colors">{v}</button>
            ))}
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={deal}
            disabled={bet > balance || bet <= 0 || dealing}
            className="px-8 py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 disabled:opacity-40">
            {dealing ? "Dealing..." : "Deal"}
          </motion.button>
        </div>

        {/* Roadmap */}
        <div className="flex gap-1.5 justify-center flex-wrap">
          {history.map((h, i) => (
            <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                h === "player" ? "bg-blue-500/20 text-blue-400" :
                h === "banker" ? "bg-red-500/20 text-red-400" :
                "bg-green-500/20 text-green-400"
              }`}>
              {h[0].toUpperCase()}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BaccaratPage;
