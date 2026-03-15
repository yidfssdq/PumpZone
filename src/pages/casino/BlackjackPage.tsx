import { useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBeta } from "@/contexts/BetaContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCasinoPlay } from "@/hooks/useCasinoPlay";
import DemoToggle from "@/components/casino/DemoToggle";
import Confetti from "@/components/casino/Confetti";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";
import {
  BJCard, createShoe, handValue, isBlackjack, isBusted,
  canDouble, shouldDealerHit, determineOutcome, isRed, GameResult
} from "@/lib/blackjack";

const CardView = ({ card, hidden = false, delay = 0 }: { card: BJCard; hidden?: boolean; delay?: number }) => (
  <motion.div
    initial={{ x: 100, opacity: 0, rotateY: 180 }}
    animate={{ x: 0, opacity: 1, rotateY: hidden ? 180 : 0 }}
    transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
    className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-center font-display font-bold text-lg select-none shadow-lg ${
      hidden
        ? "bg-gradient-to-br from-primary/40 to-secondary/40 border-primary/30"
        : "bg-card border-border"
    }`}
  >
    {!hidden && (
      <>
        <span className={isRed(card) ? "text-red-400" : "text-foreground"}>{card.rank}</span>
        <span className={`text-2xl ${isRed(card) ? "text-red-400" : "text-foreground"}`}>{card.suit}</span>
      </>
    )}
    {hidden && <span className="text-3xl opacity-50">?</span>}
  </motion.div>
);

const BlackjackPage = () => {
  const { isBeta } = useBeta();
  const { profile, setShowAuthModal } = useAuth();
  const casino = useCasinoPlay();
  const { playDeal, playCardSlide, playWin, playLose, playBlackjack, playClick } = useCasinoSfx();

  const [isDemo, setIsDemo] = useState(true);
  const effectiveDemo = isBeta || isDemo;

  const [demoBalance, setDemoBalance] = useState(100);
  const [bet, setBet] = useState(0.1);
  const [phase, setPhase] = useState<"betting" | "playing" | "dealer" | "result">("betting");
  const [playerCards, setPlayerCards] = useState<BJCard[]>([]);
  const [dealerCards, setDealerCards] = useState<BJCard[]>([]);
  const [dealerHidden, setDealerHidden] = useState(true);
  const [isDoubled, setIsDoubled] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const shoeRef = useRef<BJCard[]>([]);
  const balance = effectiveDemo ? demoBalance : (casino.balance ?? 0);

  const drawCard = () => {
    if (shoeRef.current.length < 10) shoeRef.current = createShoe();
    return shoeRef.current.pop()!;
  };

  const finishGame = useCallback((res: GameResult, doubled: boolean) => {
    setResult(res);
    if (effectiveDemo) {
      const stake = doubled ? bet * 2 : bet;
      if (res.pnl > 0) setDemoBalance(prev => prev + stake + res.pnl);
      else if (res.pnl === 0) setDemoBalance(prev => prev + stake);
    }
    if (res.outcome === "blackjack") { playBlackjack(); setShowConfetti(true); }
    else if (res.pnl > 0) { playWin(); setShowConfetti(true); }
    else playLose();
    setPhase("result");
  }, [effectiveDemo, bet, playBlackjack, playWin, playLose]);

  const dealerPlay = useCallback((pCards: BJCard[], dCards: BJCard[], doubled: boolean) => {
    setPhase("dealer");
    setDealerHidden(false);

    let cards = [...dCards];
    const addCards = () => {
      if (shouldDealerHit(cards)) {
        const c = drawCard();
        cards = [...cards, c];
        setDealerCards([...cards]);
        playCardSlide();
        setTimeout(addCards, 600);
      } else {
        const res = determineOutcome(pCards, cards, bet, doubled);
        finishGame(res, doubled);
      }
    };
    setTimeout(addCards, 400);
  }, [bet, playCardSlide, finishGame]);

  const deal = useCallback(() => {
    if (bet > balance || bet <= 0) return;
    if (effectiveDemo) setDemoBalance(prev => prev - bet);
    playDeal();

    if (shoeRef.current.length < 20) shoeRef.current = createShoe();
    const p1 = drawCard(), d1 = drawCard(), p2 = drawCard(), d2 = drawCard();

    setPlayerCards([p1, p2]);
    setDealerCards([d1, d2]);
    setDealerHidden(true);
    setIsDoubled(false);
    setResult(null);
    setShowConfetti(false);

    if (isBlackjack([p1, p2])) {
      setTimeout(() => {
        setDealerHidden(false);
        const res = determineOutcome([p1, p2], [d1, d2], bet, false);
        finishGame(res, false);
      }, 800);
      setPhase("result");
    } else {
      setPhase("playing");
    }
  }, [bet, balance, effectiveDemo, playDeal, finishGame]);

  const hit = useCallback(() => {
    if (phase !== "playing") return;
    const c = drawCard();
    const newCards = [...playerCards, c];
    setPlayerCards(newCards);
    playCardSlide();

    if (isBusted(newCards)) {
      const res = determineOutcome(newCards, dealerCards, bet, isDoubled);
      setDealerHidden(false);
      finishGame(res, isDoubled);
    }
  }, [phase, playerCards, dealerCards, bet, isDoubled, playCardSlide, finishGame]);

  const stand = useCallback(() => {
    if (phase !== "playing") return;
    dealerPlay(playerCards, dealerCards, isDoubled);
  }, [phase, playerCards, dealerCards, isDoubled, dealerPlay]);

  const double = useCallback(() => {
    if (phase !== "playing" || !canDouble(playerCards)) return;
    if (bet > balance) return;
    if (effectiveDemo) setDemoBalance(prev => prev - bet);
    setIsDoubled(true);

    const c = drawCard();
    const newCards = [...playerCards, c];
    setPlayerCards(newCards);
    playCardSlide();

    if (isBusted(newCards)) {
      const res = determineOutcome(newCards, dealerCards, bet, true);
      setDealerHidden(false);
      finishGame(res, true);
    } else {
      setTimeout(() => dealerPlay(newCards, dealerCards, true), 400);
    }
  }, [phase, playerCards, dealerCards, bet, balance, effectiveDemo, playCardSlide, dealerPlay, finishGame]);

  const pVal = handValue(playerCards);
  const dVal = handValue(dealerCards);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {showConfetti && <Confetti intensity="epic" />}

      <div className="flex items-center gap-3">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-display font-bold">🃏 Blackjack</h1>
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

      <div className="glass-card p-6 space-y-8">
        {/* Dealer */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Dealer</span>
            {dealerCards.length > 0 && (
              <span className="text-sm font-display font-bold text-foreground">
                {dealerHidden ? "?" : dVal.value}
              </span>
            )}
          </div>
          <div className="flex gap-2 justify-center min-h-[112px]">
            <AnimatePresence>
              {dealerCards.map((card, i) => (
                <CardView key={card.id} card={card} hidden={dealerHidden && i === 1} delay={i * 0.15} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className={`text-center py-3 rounded-xl font-display font-bold text-lg ${
                result.pnl > 0 ? "bg-success/10 text-success" : result.pnl === 0 ? "bg-muted text-foreground" : "bg-destructive/10 text-destructive"
              }`}>
              {result.outcome === "blackjack" ? "BLACKJACK! 🎉" :
               result.outcome === "win" || result.outcome === "dealer_bust" ? "YOU WIN!" :
               result.outcome === "push" ? "PUSH" : "BUST"}
              <span className="block text-sm mt-1">
                {result.pnl >= 0 ? "+" : ""}{result.pnl.toFixed(4)} SOL
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player */}
        <div className="text-center space-y-3">
          <div className="flex gap-2 justify-center min-h-[112px]">
            <AnimatePresence>
              {playerCards.map((card, i) => (
                <CardView key={card.id} card={card} delay={i * 0.15} />
              ))}
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">You</span>
            {playerCards.length > 0 && (
              <span className={`text-sm font-display font-bold ${pVal.value > 21 ? "text-destructive" : pVal.value === 21 ? "text-success" : "text-foreground"}`}>
                {pVal.value} {pVal.soft && pVal.value <= 21 ? "(soft)" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center flex-wrap">
          {phase === "betting" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-muted-foreground font-body">Bet:</label>
                <input type="number" value={bet}
                  onChange={e => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-24 bg-muted border border-border rounded-lg px-3 py-2 text-sm font-display focus:ring-1 focus:ring-primary outline-none"
                  step={0.01} min={0.01} />
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={deal} disabled={bet > balance || bet <= 0}
                className="px-8 py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40">
                Deal
              </motion.button>
            </>
          )}
          {phase === "playing" && (
            <>
              <motion.button whileTap={{ scale: 0.95 }} onClick={hit}
                className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-primary text-primary-foreground hover:opacity-90">Hit</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={stand}
                className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-muted text-foreground hover:bg-muted/80 border border-border">Stand</motion.button>
              {canDouble(playerCards) && bet <= balance && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={double}
                  className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30">Double</motion.button>
              )}
            </>
          )}
          {phase === "result" && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={deal} disabled={bet > balance}
              className="px-8 py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 disabled:opacity-40">
              New Hand
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlackjackPage;
