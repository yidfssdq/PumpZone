import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBeta } from "@/contexts/BetaContext";
import { useAuth } from "@/contexts/AuthContext";
import DemoToggle from "@/components/casino/DemoToggle";
import Confetti from "@/components/casino/Confetti";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";

// European roulette wheel order (authentic)
const WHEEL_ORDER = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
];
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const numColor = (n: number) => n === 0 ? "green" : RED.has(n) ? "red" : "black";

type BetType = "red"|"black"|"green"|"even"|"odd"|"low"|"high"|"dozen1"|"dozen2"|"dozen3";
const BETS: { type: BetType; label: string; mult: number; sub?: string }[] = [
  { type:"red",    label:"Red",    mult:2,  sub:"2×" },
  { type:"black",  label:"Black",  mult:2,  sub:"2×" },
  { type:"even",   label:"Even",   mult:2,  sub:"2×" },
  { type:"odd",    label:"Odd",    mult:2,  sub:"2×" },
  { type:"low",    label:"1-18",   mult:2,  sub:"2×" },
  { type:"high",   label:"19-36",  mult:2,  sub:"2×" },
  { type:"dozen1", label:"1st 12", mult:3,  sub:"3×" },
  { type:"dozen2", label:"2nd 12", mult:3,  sub:"3×" },
  { type:"dozen3", label:"3rd 12", mult:3,  sub:"3×" },
  { type:"green",  label:"Zero",   mult:36, sub:"36×" },
];

const checkWin = (n: number, t: BetType) => {
  switch(t) {
    case "red":    return RED.has(n);
    case "black":  return n > 0 && !RED.has(n);
    case "green":  return n === 0;
    case "even":   return n > 0 && n % 2 === 0;
    case "odd":    return n > 0 && n % 2 === 1;
    case "low":    return n >= 1 && n <= 18;
    case "high":   return n >= 19 && n <= 36;
    case "dozen1": return n >= 1 && n <= 12;
    case "dozen2": return n >= 13 && n <= 24;
    case "dozen3": return n >= 25 && n <= 36;
  }
};

// SVG Roulette Wheel constants
const WHEEL_SIZE = 280;
const CX = WHEEL_SIZE / 2;
const CY = WHEEL_SIZE / 2;
const R_OUTER = 130;
const R_NUMBER = 108;
const R_INNER = 72;
const TOTAL = WHEEL_ORDER.length; // 37

const segAngle = (360 / TOTAL) * (Math.PI / 180);

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const describeArc = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
};

const RoulettePage = () => {
  const { isBeta } = useBeta();
  const { playClick, playSpin, playWin, playLose } = useCasinoSfx();

  const [isDemo, setIsDemo] = useState(true);
  const effectiveDemo = isBeta || isDemo;
  const [demoBalance, setDemoBalance] = useState(100);
  const [bet, setBet] = useState(0.1);
  const [selectedBet, setSelectedBet] = useState<BetType>("red");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<{ win: boolean; pnl: number; mult: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [wheelDeg, setWheelDeg] = useState(0);
  const [ballAngle, setBallAngle] = useState(0); // degrees, animates independently
  const ballAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const balance = effectiveDemo ? demoBalance : 0;

  useEffect(() => () => {
    if (ballAnimRef.current) clearInterval(ballAnimRef.current);
    if (spinTimer.current) clearTimeout(spinTimer.current);
  }, []);

  const spin = useCallback(() => {
    if (bet > balance || bet <= 0 || spinning) return;
    playClick();
    setSpinning(true);
    setShowConfetti(false);
    setLastWin(null);
    if (effectiveDemo) setDemoBalance(p => p - bet);

    const number = Math.floor(Math.random() * 37);
    const numIdx = WHEEL_ORDER.indexOf(number);
    // Calculate target angle for wheel so numIdx segment aligns to top pointer
    const segSize = 360 / TOTAL;
    // The 0 segment starts at angle 0; numIdx segment is at numIdx * segSize
    // We want it at 0 (top), so wheel rotates by -(numIdx * segSize) + full spins
    const spins = 5 + Math.floor(Math.random() * 3);
    const targetWheel = wheelDeg + spins * 360 - numIdx * segSize;

    // Ball rotates counter-clockwise fast then decelerates
    let ballSpeed = 18;
    let ballPos = ballAngle;
    if (ballAnimRef.current) clearInterval(ballAnimRef.current);
    ballAnimRef.current = setInterval(() => {
      ballPos -= ballSpeed;
      if (ballSpeed > 2) ballSpeed *= 0.985;
      setBallAngle(ballPos);
    }, 30);

    setWheelDeg(targetWheel);
    playSpin();

    spinTimer.current = setTimeout(() => {
      if (ballAnimRef.current) clearInterval(ballAnimRef.current);
      // Snap ball to the winning number position on the wheel
      const finalBallAngle = -(numIdx * segSize + segSize / 2); // counter-clockwise position
      setBallAngle(finalBallAngle - targetWheel + wheelDeg - 10);

      setResult(number);
      const betDef = BETS.find(b => b.type === selectedBet)!;
      const win = checkWin(number, selectedBet);
      const pnl = win ? bet * (betDef.mult - 1) : -bet;
      setLastWin({ win, pnl, mult: betDef.mult });
      setHistory(prev => [number, ...prev].slice(0, 24));
      if (effectiveDemo && win) setDemoBalance(p => p + bet * betDef.mult);
      if (win) { playWin(); if (pnl > bet * 10) setShowConfetti(true); } else playLose();
      setSpinning(false);
    }, 4000);
  }, [bet, balance, spinning, selectedBet, effectiveDemo, wheelDeg, ballAngle, playClick, playSpin, playWin, playLose]);

  // Ball position in SVG coords
  const BALL_R = 88; // orbit radius
  const ballRad = (ballAngle - 90) * (Math.PI / 180);
  const ballX = CX + BALL_R * Math.cos(ballRad);
  const ballY = CY + BALL_R * Math.sin(ballRad);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {showConfetti && <Confetti intensity="epic" />}

      <div className="flex items-center gap-3">
        <Link to="/casino" className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-lg font-display font-bold gradient-text">Roulette</h1>
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
        {/* Left: controls */}
        <div className="lg:w-[280px] shrink-0 space-y-3">
          <div className="glass-card p-4 space-y-4">
            <div>
              <label className="text-[11px] text-muted-foreground font-body uppercase tracking-wider mb-1.5 block">Bet Amount (SOL)</label>
              <input type="number" value={bet}
                onChange={e => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm font-display focus:ring-1 focus:ring-primary outline-none"
                step={0.01} min={0.01}/>
              <div className="flex gap-1.5 mt-2">
                {[0.01, 0.05, 0.1, 0.5, 1].map(v => (
                  <button key={v} onClick={() => setBet(v)}
                    className="flex-1 px-1 py-1 text-[10px] font-body rounded bg-muted hover:bg-primary/15 transition-colors">{v}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Bet Type</p>
              <div className="grid grid-cols-2 gap-1.5">
                {BETS.map(b => (
                  <button key={b.type} onClick={() => setSelectedBet(b.type)}
                    className={`px-2.5 py-2 rounded-lg text-[11px] font-body font-semibold border transition-all flex items-center justify-between ${
                      selectedBet === b.type
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/30"
                    }`}>
                    <span className="flex items-center gap-1.5">
                      {b.type === "red" && <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"/>}
                      {b.type === "black" && <span className="w-2.5 h-2.5 rounded-full bg-gray-800 border border-white/20 shrink-0"/>}
                      {b.type === "green" && <span className="w-2.5 h-2.5 rounded-full bg-green-600 shrink-0"/>}
                      {b.label}
                    </span>
                    <span className="text-[9px] opacity-60">{b.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.95 }} onClick={spin}
              disabled={bet > balance || bet <= 0 || spinning}
              className="w-full py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 disabled:opacity-40 shadow-lg shadow-primary/20">
              {spinning ? "Spinning..." : "SPIN"}
            </motion.button>
          </div>

          {/* Bet info */}
          <div className="glass-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-body">Potential win</p>
            <p className="text-lg font-display font-bold text-primary mt-0.5">
              {(bet * (BETS.find(b => b.type === selectedBet)?.mult ?? 2)).toFixed(4)} SOL
            </p>
          </div>
        </div>

        {/* Right: wheel + result */}
        <div className="flex-1 space-y-3">
          <div className="glass-card p-6 flex flex-col items-center gap-5">
            {/* Pointer */}
            <div className="relative">
              {/* Outer decorative ring */}
              <div className="absolute inset-0 rounded-full border-4 border-primary/10 pointer-events-none" style={{width:WHEEL_SIZE+16,height:WHEEL_SIZE+16,top:-8,left:-8}} />

              {/* Pointer triangle */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 pointer-events-none">
                <div className="w-0 h-0" style={{
                  borderLeft: "7px solid transparent",
                  borderRight: "7px solid transparent",
                  borderTop: "14px solid hsl(263,70%,65%)",
                  filter: "drop-shadow(0 0 4px hsl(263,70%,58%))"
                }}/>
              </div>

              {/* SVG Wheel */}
              <motion.div
                animate={{ rotate: wheelDeg }}
                transition={{ duration: 4, ease: [0.17, 0.67, 0.05, 1.0] }}
                style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
              >
                <svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
                  {/* Outer rim */}
                  <circle cx={CX} cy={CY} r={R_OUTER + 4} fill="hsl(233,40%,8%)" stroke="hsl(233,20%,20%)" strokeWidth="2"/>

                  {/* Segments */}
                  {WHEEL_ORDER.map((num, i) => {
                    const startDeg = i * (360 / TOTAL);
                    const endDeg   = (i + 1) * (360 / TOTAL);
                    const midDeg   = (startDeg + endDeg) / 2;
                    const color = numColor(num);
                    const fill = color === "green" ? "hsl(160,70%,28%)" : color === "red" ? "hsl(0,75%,38%)" : "hsl(233,20%,12%)";
                    const stroke = color === "green" ? "hsl(160,70%,40%)" : color === "red" ? "hsl(0,75%,50%)" : "hsl(233,20%,22%)";

                    const textPos = polarToCartesian(CX, CY, R_NUMBER, midDeg);
                    const textRot = midDeg;

                    return (
                      <g key={i}>
                        <path d={describeArc(CX, CY, R_OUTER, startDeg, endDeg)}
                          fill={fill} stroke={stroke} strokeWidth="0.8"/>
                        <text
                          x={textPos.x} y={textPos.y}
                          textAnchor="middle" dominantBaseline="middle"
                          fill="white" fontSize="7.5"
                          fontFamily="Orbitron,sans-serif" fontWeight="600"
                          transform={`rotate(${textRot + 90}, ${textPos.x}, ${textPos.y})`}
                          opacity="0.95"
                        >{num}</text>
                      </g>
                    );
                  })}

                  {/* Inner decorative ring */}
                  <circle cx={CX} cy={CY} r={R_INNER + 4} fill="hsl(233,40%,7%)" stroke="hsl(263,70%,40%)" strokeWidth="1.5"/>
                  <circle cx={CX} cy={CY} r={R_INNER} fill="hsl(233,40%,10%)" stroke="hsl(263,70%,30%)" strokeWidth="1"/>

                  {/* Center */}
                  <circle cx={CX} cy={CY} r="22" fill="hsl(263,70%,20%)" stroke="hsl(263,70%,50%)" strokeWidth="1.5"/>
                  <circle cx={CX} cy={CY} r="8" fill="hsl(263,70%,50%)"/>

                  {/* Frets (dividers) */}
                  {WHEEL_ORDER.map((_, i) => {
                    const angleDeg = i * (360 / TOTAL) - 90;
                    const angleRad = angleDeg * (Math.PI / 180);
                    return (
                      <line key={`fret-${i}`}
                        x1={CX + (R_INNER + 4) * Math.cos(angleRad)}
                        y1={CY + (R_INNER + 4) * Math.sin(angleRad)}
                        x2={CX + R_OUTER * Math.cos(angleRad)}
                        y2={CY + R_OUTER * Math.sin(angleRad)}
                        stroke="hsl(233,20%,18%)" strokeWidth="0.5"/>
                    );
                  })}
                </svg>
              </motion.div>

              {/* Ball — rotates independently on top of the wheel */}
              <div className="absolute inset-0 pointer-events-none" style={{width:WHEEL_SIZE,height:WHEEL_SIZE}}>
                <svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
                  <circle cx={ballX} cy={ballY} r="5.5"
                    fill="white"
                    stroke="hsl(263,70%,65%)" strokeWidth="1"
                    filter="drop-shadow(0 0 3px rgba(255,255,255,0.8))"/>
                </svg>
              </div>
            </div>

            {/* Result display */}
            <AnimatePresence>
              {result !== null && !spinning && (
                <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-center space-y-2">
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl font-display font-black text-2xl ${
                    numColor(result) === "red"   ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                    numColor(result) === "green" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                    "bg-foreground/10 text-foreground border border-foreground/20"
                  }`}>
                    <span className={`w-4 h-4 rounded-full ${
                      numColor(result) === "red" ? "bg-red-500" : numColor(result) === "green" ? "bg-green-500" : "bg-gray-800 border border-white/30"
                    }`}/>
                    {result}
                  </div>
                  {lastWin && (
                    <p className={`font-display font-bold text-lg ${lastWin.win ? "text-success" : "text-destructive"}`}>
                      {lastWin.win ? `+${lastWin.pnl.toFixed(4)} SOL` : `${lastWin.pnl.toFixed(4)} SOL`}
                    </p>
                  )}
                </motion.div>
              )}
              {spinning && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-center">
                  <p className="text-sm font-display text-muted-foreground animate-pulse">Spinning...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History */}
          <div className="glass-card p-4">
            <h3 className="text-[11px] text-muted-foreground font-body uppercase tracking-wider mb-3">Last Results</h3>
            <div className="flex gap-1.5 flex-wrap">
              {history.map((n, i) => (
                <motion.div key={`${i}-${n}`}
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-display font-bold shrink-0 ${
                    n === 0 ? "bg-green-500/20 text-green-400 border border-green-500/30 ring-1 ring-green-500/20" :
                    RED.has(n) ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                    "bg-foreground/8 text-foreground/70 border border-foreground/15"
                  }`}>
                  {n}
                </motion.div>
              ))}
              {history.length === 0 && (
                <p className="text-[10px] text-muted-foreground/50 font-body">No results yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoulettePage;
