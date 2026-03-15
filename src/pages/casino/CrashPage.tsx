import { useState, useRef, useCallback, useEffect } from "react";
import { Users, ChevronUp, ChevronDown, TrendingUp } from "lucide-react";
import Confetti from "@/components/casino/Confetti";
import { useCasinoSfx } from "@/hooks/useCasinoSfx";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBeta } from "@/contexts/BetaContext";

const CURVE_SPEED = 0.08;
const CRASH_DISPLAY_MS = 4000;
const POLL_RISING = 800;
const POLL_NORMAL = 1500;

function computeMultiplier(elapsed: number): number {
  return Math.pow(Math.E, CURVE_SPEED * elapsed);
}

interface RoundData {
  id: string;
  phase: "betting" | "rising" | "crashed";
  betting_ends_at: string;
  curve_started_at: string | null;
  crashed_at: string | null;
  crash_point?: number;
  player_count: number;
  user_bet: { id: string; bet_amount: number; cashout_multiplier: number | null; pnl: number | null } | null;
  server_time: string;
}

// Demo player names for the live bets feed
const DEMO_NAMES = ["alpha_wolf","crypto_king","moon_shot","defi_degen","sol_runner","nft_flipper","pump_it","chain_lord","degen_chad","yield_max"];

interface LiveBet { name: string; amount: number; status: "active" | "cashed" | "busted"; cashoutMult?: number; }

const CrashPage = () => {
  const { profile, refreshProfile, setShowAuthModal } = useAuth();
  const { playWin, playLose, playClick } = useCasinoSfx();
  const { t } = useLanguage();
  const { isBeta } = useBeta();

  const [phase, setPhase] = useState<"betting" | "rising" | "crashed">("betting");
  const [countdown, setCountdown] = useState(10);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);
  const [playerCount, setPlayerCount] = useState(0);

  const [bet, setBet] = useState(0.01);
  const [customBet, setCustomBet] = useState("0.01");
  const [autoCashout, setAutoCashout] = useState(2.0);
  const [myBet, setMyBet] = useState<RoundData["user_bet"]>(null);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [cashoutResult, setCashoutResult] = useState<{ mult: number; pnl: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundIdRef = useRef<string | null>(null);
  const curvePointsRef = useRef<{ x: number; y: number }[]>([]);
  const autoCashoutRef = useRef(autoCashout);
  const hasCashedOutRef = useRef(false);
  const myBetRef = useRef(myBet);
  const phaseRef = useRef(phase);
  const serverOffsetRef = useRef(0);
  const curveStartRef = useRef<number | null>(null);
  const crashPauseUntilRef = useRef(0);
  const lastCrashRoundRef = useRef<string | null>(null);
  const bettingEndsAtRef = useRef(0);
  const cashingOutRef = useRef(false);

  useEffect(() => { autoCashoutRef.current = autoCashout; }, [autoCashout]);
  useEffect(() => { hasCashedOutRef.current = hasCashedOut; }, [hasCashedOut]);
  useEffect(() => { myBetRef.current = myBet; }, [myBet]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { cashingOutRef.current = cashingOut; }, [cashingOut]);

  const balance = profile?.casino_balance ?? 0;

  // ── CANVAS with neon grid ──────────────────────────────────────────────
  const drawCurve = useCallback((points: { x: number; y: number }[], crashed: boolean, currentMult: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // ── Neon grid background ──
    const gridSize = 40;
    const purpleGrid = crashed ? "rgba(239,68,68,0.06)" : "rgba(139,92,246,0.07)";
    ctx.strokeStyle = purpleGrid;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // ── Perspective floor effect at bottom ──
    const floorH = h * 0.25;
    const floorGrad = ctx.createLinearGradient(0, h - floorH, 0, h);
    floorGrad.addColorStop(0, "transparent");
    floorGrad.addColorStop(1, crashed ? "rgba(239,68,68,0.04)" : "rgba(139,92,246,0.05)");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h - floorH, w, floorH);

    const pad = { top: 24, bottom: 36, left: 54, right: 20 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;
    if (cw <= 0 || ch <= 0) return;

    const maxY = Math.max(currentMult * 1.2, 1.8);
    const toY = (v: number) => pad.top + ch * (1 - (v - 1) / (maxY - 1));

    // Y-axis labels + horizontal lines
    const step = maxY <= 2.5 ? 0.5 : maxY <= 5 ? 1 : maxY <= 15 ? 2 : 5;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let v = 1.0; v <= maxY; v += step) {
      const y = toY(v);
      if (y < pad.top - 4 || y > h - pad.bottom + 4) continue;
      // Subtle grid line
      ctx.strokeStyle = crashed ? "rgba(239,68,68,0.08)" : "rgba(139,92,246,0.1)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      // Label
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `500 10px 'Orbitron', sans-serif`;
      ctx.fillText(`${v.toFixed(1)}×`, pad.left - 6, y);
    }

    if (points.length < 2) return;
    const maxX = Math.max(...points.map(p => p.x), 1);
    const toX = (x: number) => pad.left + (x / maxX) * cw;
    const baseline = toY(1.0);

    // Fill gradient under curve
    const mainColor = crashed ? [239, 68, 68] : [139, 92, 246];
    const fillGrad = ctx.createLinearGradient(0, baseline, 0, pad.top);
    fillGrad.addColorStop(0, `rgba(${mainColor.join(",")}, 0)`);
    fillGrad.addColorStop(0.5, `rgba(${mainColor.join(",")}, 0.08)`);
    fillGrad.addColorStop(1, `rgba(${mainColor.join(",")}, 0.18)`);
    ctx.beginPath();
    ctx.moveTo(toX(points[0].x), baseline);
    for (const p of points) ctx.lineTo(toX(p.x), toY(p.y));
    ctx.lineTo(toX(points[points.length - 1].x), baseline);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Main curve line with glow
    ctx.shadowColor = crashed ? "rgba(239,68,68,0.8)" : "rgba(139,92,246,0.8)";
    ctx.shadowBlur = crashed ? 8 : 12;
    ctx.beginPath();
    ctx.moveTo(toX(points[0].x), toY(points[0].y));
    for (const p of points) ctx.lineTo(toX(p.x), toY(p.y));
    ctx.strokeStyle = crashed ? "#ef4444" : "#8b5cf6";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Live dot at end
    if (!crashed && points.length > 1) {
      const last = points[points.length - 1];
      const cx2 = toX(last.x), cy2 = toY(last.y);
      // Outer glow ring
      ctx.beginPath(); ctx.arc(cx2, cy2, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(139,92,246,0.2)"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx2, cy2, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(139,92,246,0.4)"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx2, cy2, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#c4b5fd"; ctx.fill();
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
  }, []);

  const doCashOut = useCallback(async () => {
    if (phaseRef.current !== "rising" || cashingOutRef.current || !myBetRef.current || hasCashedOutRef.current) return;
    cashingOutRef.current = true;
    setCashingOut(true);
    hasCashedOutRef.current = true;
    setHasCashedOut(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("crash-game", {
        body: { action: "cashout", round_id: roundIdRef.current },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setCashoutResult({ mult: data.multiplier, pnl: data.pnl });
      setShowConfetti(true);
      playWin();
      await refreshProfile();
    } catch (e: any) {
      hasCashedOutRef.current = false;
      setHasCashedOut(false);
      setError(e.message || "Error");
    } finally {
      cashingOutRef.current = false;
      setCashingOut(false);
    }
  }, [playWin, refreshProfile]);

  const startAnimation = useCallback((curveStartMs: number) => {
    if (curveStartRef.current === curveStartMs) return;
    curveStartRef.current = curveStartMs;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    curvePointsRef.current = [];
    const animate = () => {
      if (phaseRef.current !== "rising") return;
      const now = Date.now() + serverOffsetRef.current;
      const elapsed = Math.max(0, (now - curveStartMs) / 1000);
      const mult = computeMultiplier(elapsed);
      setMultiplier(mult);
      if (myBetRef.current && !hasCashedOutRef.current && mult >= autoCashoutRef.current) doCashOut();
      curvePointsRef.current.push({ x: elapsed, y: mult });
      if (curvePointsRef.current.length > 500) {
        curvePointsRef.current = curvePointsRef.current.filter((_, i) => i % 2 === 0);
      }
      drawCurve(curvePointsRef.current, false, mult);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  }, [drawCurve, doCashOut]);

  const resetRound = useCallback(() => {
    setMyBet(null);
    setHasCashedOut(false);
    setCashoutResult(null);
    setCrashPoint(null);
    setShowConfetti(false);
    setMultiplier(1.0);
    setError(null);
    curvePointsRef.current = [];
    curveStartRef.current = null;
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = 0; }
    clearCanvas();
  }, [clearCanvas]);

  const processRound = useCallback((r: RoundData) => {
    serverOffsetRef.current = new Date(r.server_time).getTime() - Date.now();
    if (roundIdRef.current && roundIdRef.current !== r.id) resetRound();
    roundIdRef.current = r.id;
    setPlayerCount(r.player_count);
    bettingEndsAtRef.current = new Date(r.betting_ends_at).getTime();
    if (r.user_bet) { setMyBet(r.user_bet); if (r.user_bet.cashout_multiplier) setHasCashedOut(true); }
    if (r.phase === "betting") { if (phaseRef.current !== "betting") resetRound(); setPhase("betting"); }
    if (r.phase === "rising") { setPhase("rising"); if (r.curve_started_at) startAnimation(new Date(r.curve_started_at).getTime()); }
    if (r.phase === "crashed" && r.crash_point) {
      if (lastCrashRoundRef.current !== r.id) {
        lastCrashRoundRef.current = r.id;
        setPhase("crashed");
        setCrashPoint(r.crash_point);
        setMultiplier(r.crash_point);
        setCrashHistory(prev => prev[0] === r.crash_point ? prev : [r.crash_point!, ...prev].slice(0, 20));
        if (curvePointsRef.current.length > 0) drawCurve(curvePointsRef.current, true, r.crash_point);
        if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = 0; }
        if (myBetRef.current && !hasCashedOutRef.current) playLose();
        crashPauseUntilRef.current = Date.now() + CRASH_DISPLAY_MS;
      }
    }
  }, [resetRound, startAnimation, drawCurve, playLose]);

  // ── Demo simulation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isBeta && profile) return;
    let mounted = true;
    let timeout: ReturnType<typeof setTimeout>;

    // Generate fake live bets
    const genBets = () => {
      const count = 5 + Math.floor(Math.random() * 8);
      return Array.from({ length: count }, () => ({
        name: DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)],
        amount: parseFloat((Math.random() * 2 + 0.01).toFixed(3)),
        status: "active" as const,
      }));
    };

    const runDemoRound = () => {
      if (!mounted) return;
      resetRound();
      setPhase("betting");
      setCountdown(5);
      bettingEndsAtRef.current = Date.now() + 5000;
      setLiveBets(genBets());

      timeout = setTimeout(() => {
        if (!mounted) return;
        setPhase("rising");
        const demoCrashPoint = Math.max(1.01, parseFloat((1 / (1 - Math.random() * 0.96)).toFixed(2)));
        const curveStart = Date.now();
        curveStartRef.current = curveStart;
        curvePointsRef.current = [];
        if (animRef.current) cancelAnimationFrame(animRef.current);

        // Progressively cash out fake players
        let cashedCount = 0;
        const cashInterval = setInterval(() => {
          setLiveBets(prev => {
            const active = prev.filter(b => b.status === "active");
            if (active.length === 0) { clearInterval(cashInterval); return prev; }
            const idx = Math.floor(Math.random() * active.length);
            const mult = parseFloat((1.1 + Math.random() * 3).toFixed(2));
            return prev.map((b, i) => {
              const ai = prev.filter(x => x.status === "active").findIndex((_, ii) => ii === idx);
              return b === active[idx] ? { ...b, status: "cashed" as const, cashoutMult: mult } : b;
            });
          });
        }, 600);

        const animate = () => {
          if (!mounted || phaseRef.current !== "rising") return;
          const elapsed = (Date.now() - curveStart) / 1000;
          const mult = computeMultiplier(elapsed);
          setMultiplier(mult);
          curvePointsRef.current.push({ x: elapsed, y: mult });
          if (curvePointsRef.current.length > 500) {
            curvePointsRef.current = curvePointsRef.current.filter((_, i) => i % 2 === 0);
          }
          if (mult >= demoCrashPoint) {
            clearInterval(cashInterval);
            setPhase("crashed");
            setCrashPoint(demoCrashPoint);
            setMultiplier(demoCrashPoint);
            setCrashHistory(prev => [demoCrashPoint, ...prev].slice(0, 20));
            drawCurve(curvePointsRef.current, true, demoCrashPoint);
            // Mark remaining active bets as busted
            setLiveBets(prev => prev.map(b => b.status === "active" ? { ...b, status: "busted" as const } : b));
            playLose();
            timeout = setTimeout(runDemoRound, CRASH_DISPLAY_MS);
            return;
          }
          drawCurve(curvePointsRef.current, false, mult);
          animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
      }, 5000);
    };

    runDemoRound();
    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isBeta, profile, resetRound, drawCurve, playLose]);

  // ── Polling (real mode) ───────────────────────────────────────────────
  useEffect(() => {
    if (isBeta || !profile) return;
    let mounted = true;
    const fetchAndSchedule = async () => {
      if (!mounted) return;
      if (Date.now() < crashPauseUntilRef.current) { pollingRef.current = setTimeout(fetchAndSchedule, 500); return; }
      try {
        const { data, error: fnError } = await supabase.functions.invoke("crash-game", { body: { action: "get_or_create_round" } });
        if (mounted && !fnError && !data?.error) processRound(data as RoundData);
      } catch {}
      if (!mounted) return;
      const delay = phaseRef.current === "rising" ? POLL_RISING : POLL_NORMAL;
      pollingRef.current = setTimeout(fetchAndSchedule, delay);
    };
    fetchAndSchedule();
    return () => {
      mounted = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isBeta, profile, processRound]);

  // ── Countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "betting") return;
    const interval = setInterval(() => {
      const ends = bettingEndsAtRef.current;
      if (!ends) return;
      const remaining = (ends - Date.now() - serverOffsetRef.current) / 1000;
      setCountdown(Math.max(0, Math.ceil(remaining)));
    }, 100);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Actions ───────────────────────────────────────────────────────────
  const placeBet = async () => {
    if (isBeta) { setError("Demo mode — bet disabled"); return; }
    if (!profile) { setShowAuthModal(true); return; }
    if (phase !== "betting" || placing || !roundIdRef.current) return;
    if (bet > balance) { setError("Insufficient balance"); return; }
    setPlacing(true); setError(null); playClick();
    try {
      const { data, error: fnError } = await supabase.functions.invoke("crash-game", {
        body: { action: "place_bet", round_id: roundIdRef.current, bet_amount: bet },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setMyBet(data.bet);
      await refreshProfile();
    } catch (e: any) { setError(e.message || "Error"); } finally { setPlacing(false); }
  };

  const handleBetChange = (val: string) => {
    setCustomBet(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) setBet(n);
  };

  const hasBet = !!myBet;
  const betAmount = myBet?.bet_amount ?? 0;

  // Multiplier display color + glow
  const multDisplay = (() => {
    if (phase === "crashed") return { color: "text-red-400", glow: "text-glow-red", label: "BUSTED" };
    if (multiplier >= 10) return { color: "text-amber-400", glow: "text-glow-amber", label: "" };
    if (multiplier >= 2) return { color: "text-green-400", glow: "text-glow-green", label: "" };
    return { color: "text-violet-300", glow: "text-glow-purple", label: "" };
  })();

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 53px)", overflow: "hidden" }}>
      {showConfetti && <Confetti intensity="epic" />}

      {/* ── Top history ticker ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto scrollbar-none shrink-0"
        style={{ background: "hsl(240 25% 6%)", borderColor: "hsl(240 15% 12%)" }}>
        <div className="flex items-center gap-1 shrink-0 text-[10px] font-display text-muted-foreground">
          <TrendingUp className="w-3 h-3" /> HISTORY
        </div>
        <div className="flex gap-1.5 items-center overflow-x-auto scrollbar-none flex-1">
          {crashHistory.slice(0, 20).map((cp, i) => (
            <span key={i} className={`shrink-0 text-[10px] font-display font-700 px-2 py-0.5 rounded ${
              cp >= 10 ? "bg-amber-500/20 text-amber-400 border border-amber-500/25"
              : cp >= 5  ? "bg-green-500/20 text-green-400 border border-green-500/25"
              : cp >= 2  ? "bg-violet-500/20 text-violet-400 border border-violet-500/25"
              : "bg-red-500/15 text-red-400 border border-red-500/20"
            }`}>
              {cp.toFixed(2)}×
            </span>
          ))}
          {crashHistory.length === 0 && (
            <span className="text-[10px] text-muted-foreground font-body">Waiting for results...</span>
          )}
        </div>
        <div className="live-badge shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>LIVE
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: bet controls + live bets ── */}
        <div className="w-64 shrink-0 flex flex-col border-r overflow-y-auto"
          style={{ borderColor: "hsl(240 15% 12%)", background: "hsl(240 25% 6%)" }}>

          {/* Bet panel */}
          <div className="p-3 space-y-3 border-b" style={{ borderColor: "hsl(240 15% 12%)" }}>
            <div>
              <label className="text-[9px] font-display font-600 text-muted-foreground uppercase tracking-widest block mb-1.5">Bet Amount</label>
              <div className="flex items-center gap-1">
                <div className="flex-1 relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-display">◎</span>
                  <input type="number" value={customBet} onChange={e => handleBetChange(e.target.value)}
                    disabled={phase !== "betting" || hasBet}
                    className="input-game w-full pl-6 py-2 text-xs disabled:opacity-50"
                    step="0.001" min="0.001"/>
                </div>
                <div className="flex gap-0.5">
                  {["½","2×","MAX"].map(m => (
                    <button key={m} disabled={phase !== "betting" || hasBet}
                      onClick={() => {
                        if (m === "MAX") { setBet(balance); setCustomBet(balance.toFixed(4)); }
                        else if (m === "½") { const v = bet * 0.5; setBet(v); setCustomBet(v.toFixed(4)); }
                        else { const v = Math.min(bet * 2, balance); setBet(v); setCustomBet(v.toFixed(4)); }
                      }}
                      className="px-2 py-2 rounded text-[9px] font-display font-600 border border-white/10 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40">
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-display font-600 text-muted-foreground uppercase tracking-widest block mb-1.5">Auto Cashout</label>
              <div className="flex items-center gap-1">
                <div className="flex-1 relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-display">×</span>
                  <input type="number" value={autoCashout}
                    onChange={e => setAutoCashout(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
                    className="input-game w-full pl-6 py-2 text-xs"
                    step="0.1" min="1.01"/>
                </div>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => setAutoCashout(p => parseFloat((p + 0.5).toFixed(1)))}
                    className="p-1 rounded border border-white/10 text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronUp className="w-3 h-3"/>
                  </button>
                  <button onClick={() => setAutoCashout(p => Math.max(1.01, parseFloat((p - 0.5).toFixed(1))))}
                    className="p-1 rounded border border-white/10 text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronDown className="w-3 h-3"/>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground font-body">Profit on win</span>
              <span className="font-display font-700 text-success">+{(bet * (autoCashout - 1)).toFixed(4)} SOL</span>
            </div>

            {/* Action button */}
            {phase === "betting" && !hasBet && (
              <button onClick={placeBet} disabled={placing || bet > balance} className="btn-bet">
                {placing ? "Placing..." : `BET ${bet.toFixed(4)} SOL`}
              </button>
            )}
            {phase === "betting" && hasBet && (
              <div className="w-full py-3 rounded-lg text-center text-xs font-display font-700 border border-primary/30 text-primary bg-primary/10">
                ✓ BET PLACED — {betAmount.toFixed(4)} SOL
              </div>
            )}
            {phase === "rising" && hasBet && !hasCashedOut && (
              <button onClick={doCashOut} disabled={cashingOut} className="btn-cashout text-white">
                {cashingOut ? "..." : `CASH OUT ${(betAmount * multiplier).toFixed(4)} SOL`}
              </button>
            )}
            {phase === "rising" && (!hasBet || hasCashedOut) && (
              <div className="w-full py-3 rounded-lg text-center text-[11px] font-body text-muted-foreground border border-white/8">
                {hasCashedOut && cashoutResult ? `✓ Cashed @${cashoutResult.mult.toFixed(2)}×` : "Waiting for launch..."}
              </div>
            )}
            {phase === "crashed" && (
              <div className="w-full py-3 rounded-lg text-center text-[11px] font-body text-muted-foreground border border-white/8">
                Next round soon...
              </div>
            )}

            {error && <p className="text-[10px] text-destructive font-body text-center">{error}</p>}
            {cashoutResult && (
              <div className="p-2.5 rounded-lg border border-success/25 bg-success/10 text-center">
                <p className="text-xs font-display font-700 text-success">🚀 +{cashoutResult.pnl.toFixed(4)} SOL</p>
              </div>
            )}
            {phase === "crashed" && hasBet && !hasCashedOut && !cashoutResult && (
              <div className="p-2.5 rounded-lg border border-destructive/25 bg-destructive/10 text-center">
                <p className="text-xs font-display font-700 text-destructive">💥 -{betAmount.toFixed(4)} SOL</p>
              </div>
            )}

            {/* Balance */}
            <div className="flex items-center justify-between pt-1 border-t border-white/6">
              <span className="text-[9px] text-muted-foreground font-body">Balance</span>
              <span className="text-[11px] font-display font-700 text-primary">{(isBeta ? 100 : balance).toFixed(4)} SOL</span>
            </div>
          </div>

          {/* Live bets list */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "hsl(240 15% 12%)" }}>
              <div className="flex items-center gap-1.5 text-[9px] font-display text-muted-foreground uppercase tracking-widest">
                <Users className="w-3 h-3"/>
                <span>Players ({isBeta ? liveBets.length : playerCount})</span>
              </div>
            </div>
            <div className="space-y-0">
              {liveBets.map((lb, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 border-b hover:bg-white/2 transition-colors"
                  style={{ borderColor: "hsl(240 15% 10%)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-display font-700 shrink-0"
                      style={{ background: `hsl(${(i * 37 + 200) % 360} 60% 35%)`, color: "white" }}>
                      {lb.name[0].toUpperCase()}
                    </div>
                    <span className="text-[10px] font-body text-muted-foreground truncate">{lb.name}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[10px] font-display font-700 text-foreground">{lb.amount.toFixed(3)}</p>
                    {lb.status === "cashed" && <p className="text-[8px] font-display text-success">{lb.cashoutMult?.toFixed(2)}×</p>}
                    {lb.status === "busted" && <p className="text-[8px] font-display text-destructive">BUST</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Center: game canvas ── */}
        <div className="flex-1 relative overflow-hidden"
          style={{ background: "hsl(240 30% 4%)" }}>

          {/* Canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: "block" }}/>

          {/* Central multiplier display */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center select-none">
              {phase === "betting" && (
                <div className="space-y-2">
                  <p className="text-[80px] sm:text-[100px] font-display font-900 text-foreground/25 tabular-nums leading-none">
                    {countdown}s
                  </p>
                  <p className="text-sm font-body text-muted-foreground/60 tracking-widest uppercase">Next round</p>
                </div>
              )}
              {phase === "rising" && (
                <div className={`text-[80px] sm:text-[100px] font-display font-900 tabular-nums leading-none ${multDisplay.color} ${multDisplay.glow}`}
                  style={{ fontVariantNumeric: "tabular-nums" }}>
                  {multiplier.toFixed(2)}×
                </div>
              )}
              {phase === "crashed" && crashPoint && (
                <div className="space-y-2 animate-crash-shake">
                  <p className="text-[80px] sm:text-[100px] font-display font-900 text-red-400 text-glow-red tabular-nums leading-none">
                    {crashPoint.toFixed(2)}×
                  </p>
                  <p className="text-base font-display font-700 text-red-400/70 tracking-widest animate-pulse">
                    ROUND OVER
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
            <span className="text-[9px] text-muted-foreground/40 font-body">⚡ Provably Fair</span>
            <span className="text-[9px] text-muted-foreground/40 font-body flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success/60 inline-block"/>Solana
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrashPage;
