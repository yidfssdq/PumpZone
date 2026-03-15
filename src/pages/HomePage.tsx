import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBeta } from "@/contexts/BetaContext";
import GameCard from "@/components/casino/GameCard";

const TTL = 60_000;
const rc = <T,>(k: string): T|null => { try { const r=sessionStorage.getItem(k); if(!r) return null; const {ts,d}=JSON.parse(r); return Date.now()-ts>TTL?null:d; } catch { return null; } };
const wc = (k: string, d: unknown) => { try { sessionStorage.setItem(k,JSON.stringify({ts:Date.now(),d})); } catch {} };

const GAMES = [
  { id:"crash",     path:"/casino/crash",     name:"Crash",     tag:"HOT", rtp:"100% RTP" },
  { id:"blackjack", path:"/casino/blackjack", name:"Blackjack", tag:"",    rtp:"100% RTP" },
  { id:"plinko",    path:"/casino/plinko",    name:"Plinko",    tag:"",    rtp:"100% RTP" },
  { id:"mines",     path:"/casino/mines",     name:"Mines",     tag:"HOT", rtp:"100% RTP" },
  { id:"dice",      path:"/casino/dice",      name:"Dice",      tag:"",    rtp:"100% RTP" },
  { id:"roulette",  path:"/casino/roulette",  name:"Roulette",  tag:"",    rtp:"100% RTP" },
  { id:"slots",     path:"/casino/slots",     name:"Slots",     tag:"",    rtp:"100% RTP" },
  { id:"hilo",      path:"/casino/hilo",      name:"Hi-Lo",     tag:"",    rtp:"100% RTP" },
  { id:"towers",    path:"/casino/towers",    name:"Towers",    tag:"",    rtp:"100% RTP" },
  { id:"baccarat",  path:"/casino/baccarat",  name:"Baccarat",  tag:"",    rtp:"100% RTP" },
  { id:"coinflip",  path:"/casino/coinflip",  name:"Coinflip",  tag:"",    rtp:"100% RTP" },
  { id:"keno",      path:"/casino/keno",      name:"Keno",      tag:"",    rtp:"100% RTP" },
];

export default function HomePage() {
  const { profile, setShowAuthModal } = useAuth();
  const { isBeta } = useBeta();
  const navigate = useNavigate();
  const { username: refCode } = useParams<{ username: string }>();

  const [solPrice,  setSolPrice]  = useState<number|null>(() => rc("sol_p"));
  const [solChange, setSolChange] = useState<number|null>(() => rc("sol_c"));
  const [stats,     setStats]     = useState<{players:number,volume:number}|null>(() => rc("stats_h"));
  const fetched = useRef(false);

  useEffect(() => { if (refCode) localStorage.setItem("referral_code", refCode); }, [refCode]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    if (!rc("sol_p")) {
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true")
        .then(r=>r.json()).then(d=>{
          if (d?.solana?.usd) { setSolPrice(d.solana.usd); wc("sol_p",d.solana.usd); }
          if (d?.solana?.usd_24h_change) { setSolChange(d.solana.usd_24h_change); wc("sol_c",d.solana.usd_24h_change); }
        }).catch(()=>{});
    }
    if (!rc("stats_h")) {
      supabase.rpc("get_platform_stats").then(({data})=>{
        const d=(Array.isArray(data)?data[0]:data) as any;
        if (d) { const s={players:+d.total_players||0,volume:parseFloat(d.total_volume)||0}; setStats(s); wc("stats_h",s); }
      }).catch(()=>{});
    }
  }, []);

  const displayGames = isBeta ? GAMES.filter(g=>g.id!=="blackjack") : GAMES;

  return (
    <div className="pb-20">

      {/* ── HERO ── pure CSS animations, no framer ── */}
      <section className="relative flex flex-col items-center justify-center text-center"
        style={{ minHeight:"calc(100vh - 52px - 80px)" }}>

        {/* Ambient glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[360px] rounded-full pointer-events-none"
          style={{ background:"hsl(168 82% 42% / 0.05)", filter:"blur(80px)" }}/>

        {/* SOL pill */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full mb-8 text-[10px] font-display font-600 tracking-widest"
          style={{ background:"hsl(222 25% 6% / 0.92)", border:"1px solid hsl(222 18% 22%)", backdropFilter:"blur(8px)", boxShadow:"0 2px 12px rgba(0,0,0,0.5)", animationDelay:"0ms" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"/>
          <span className="text-white/55">SOL</span>
          <span className="text-white font-700">{solPrice ? `$${solPrice.toFixed(2)}` : "—"}</span>
          {solChange !== null && (
            <span className={solChange>=0 ? "text-success" : "text-destructive"}>
              {solChange>=0?"+":""}{solChange.toFixed(2)}%
            </span>
          )}
          {stats && (
            <>
              <span className="text-white/30 mx-0.5">·</span>
              <span className="text-white/55">{stats.players.toLocaleString()} players</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="animate-fade-up font-display font-900 leading-[0.9] tracking-tight mb-6"
          style={{ fontSize:"clamp(3rem,9vw,7.5rem)", animationDelay:"60ms" }}>
          <span className="gradient-text">The Casino</span>
          <br/>
          <span className="text-white" style={{ textShadow:"0 2px 20px rgba(0,0,0,0.8)" }}>That Gives a Fuck.</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-up text-base font-body max-w-sm mb-10 leading-relaxed"
          style={{ color:"rgba(255,255,255,0.72)", textShadow:"0 1px 8px rgba(0,0,0,0.8)", animationDelay:"120ms" }}>
          Just the purest form of gambling — the way it should be.
          <br/>
          <span style={{ color:"hsl(168 82% 62%)" }}>Zero house edge. Provably fair. On-chain.</span>
        </p>

        {/* CTAs */}
        <div className="animate-fade-up flex flex-wrap items-center justify-center gap-3 mb-10"
          style={{ animationDelay:"180ms" }}>
          <Link to="/casino/crash"
            className="flex items-center gap-2 px-7 py-3.5 rounded-lg font-display font-700 text-sm tracking-wider transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{ background:"linear-gradient(135deg,hsl(168 82% 38%),hsl(178 88% 32%))", color:"hsl(222 25% 5%)", boxShadow:"0 4px 24px hsl(168 82% 38% / 0.45)" }}>
            PLAY NOW <ArrowRight className="w-4 h-4"/>
          </Link>
          {!profile && !isBeta && (
            <button onClick={()=>setShowAuthModal(true)}
              className="px-7 py-3.5 rounded-lg font-display font-700 text-sm tracking-wider transition-all hover:border-primary/40 hover:text-primary"
              style={{ background:"rgba(0,0,0,0.55)", border:"1px solid rgba(255,255,255,0.22)", color:"rgba(255,255,255,0.8)", backdropFilter:"blur(8px)" }}>
              CREATE ACCOUNT
            </button>
          )}
          {profile && (
            <div className="inline-flex items-center gap-2.5 px-4 py-3 rounded-lg"
              style={{ background:"rgba(0,0,0,0.6)", border:"1px solid hsl(168 82% 42% / 0.4)", backdropFilter:"blur(10px)" }}>
              <span className="text-[10px] text-white/50 font-body">Balance</span>
              <span className="font-display font-700 text-primary">{profile.casino_balance.toFixed(4)} SOL</span>
              {solPrice && <span className="text-[10px] text-white/40">≈ ${(profile.casino_balance*solPrice).toFixed(2)}</span>}
            </div>
          )}
        </div>

        {/* Scroll hint */}
        <div className="animate-fade-up flex flex-col items-center gap-1.5"
          style={{ color:"rgba(255,255,255,0.4)", animationDelay:"280ms" }}>
          <span className="text-[9px] font-display tracking-widest uppercase">Explore games</span>
          <div className="w-px h-8" style={{ background:"linear-gradient(to bottom,hsl(168 82% 42% / 0.35),transparent)" }}/>
        </div>
      </section>

      {/* ── GAMES GRID — CSS stagger, no framer ── */}
      <section className="mt-4 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-display font-700 tracking-widest uppercase"
            style={{ color:"rgba(255,255,255,0.65)", textShadow:"0 1px 6px rgba(0,0,0,0.7)" }}>
            {displayGames.length} Games
          </h2>
          <span className="live-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"/>LIVE
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {displayGames.map((g, i) => (
            <div key={g.id}
              className="animate-fade-up"
              style={{ animationDelay:`${i*35}ms` }}>
              <GameCard
                id={g.id}
                name={g.name}
                rtp={g.rtp}
                tag={g.tag}
                onClick={()=>navigate(g.path)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20 text-center">
        <div className="h-px max-w-xs mx-auto mb-4"
          style={{ background:"linear-gradient(90deg,transparent,hsl(168 82% 42% / 0.18),transparent)" }}/>
        <p className="text-xs font-body" style={{ color:"rgba(255,255,255,0.38)" }}>
          100% RTP · Provably Fair · Built on Solana
        </p>
      </section>
    </div>
  );
}
