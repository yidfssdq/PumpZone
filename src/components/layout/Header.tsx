import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBeta } from "@/contexts/BetaContext";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, User, Gift, History, Wallet, ChevronRight } from "lucide-react";
import { GameIcon } from "@/components/casino/GameIcon";

interface HeaderProps { onOpenWaitlist?: () => void; }

const GAME_CATEGORIES = [
  {
    label: "Popular",
    games: [
      { path:"/casino/crash",     id:"crash",     name:"Crash",     tag:"HOT",  tagColor:"text-red-400" },
      { path:"/casino/mines",     id:"mines",     name:"Mines",     tag:"HOT",  tagColor:"text-amber-400" },
      { path:"/casino/plinko",    id:"plinko",    name:"Plinko",    tag:"",     tagColor:"" },
      { path:"/casino/dice",      id:"dice",      name:"Dice",      tag:"",     tagColor:"" },
    ],
  },
  {
    label: "Cards",
    games: [
      { path:"/casino/blackjack", id:"blackjack", name:"Blackjack", tag:"",     tagColor:"" },
      { path:"/casino/hilo",      id:"hilo",      name:"Hi-Lo",     tag:"",     tagColor:"" },
      { path:"/casino/baccarat",  id:"baccarat",  name:"Baccarat",  tag:"",     tagColor:"" },
    ],
  },
  {
    label: "More",
    games: [
      { path:"/casino/roulette",  id:"roulette",  name:"Roulette",  tag:"",     tagColor:"" },
      { path:"/casino/slots",     id:"slots",     name:"Slots",     tag:"",     tagColor:"" },
      { path:"/casino/towers",    id:"towers",    name:"Towers",    tag:"",     tagColor:"" },
      { path:"/casino/coinflip",  id:"coinflip",  name:"Coinflip",  tag:"",     tagColor:"" },
      { path:"/casino/keno",      id:"keno",      name:"Keno",      tag:"",     tagColor:"" },
    ],
  },
];

const ALL_GAMES = GAME_CATEGORIES.flatMap(c => c.games);

export default function Header({ onOpenWaitlist }: HeaderProps) {
  const location = useLocation();
  const { user, profile, setShowAuthModal, signOut } = useAuth();
  const { isBeta } = useBeta();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const currentGame = ALL_GAMES.find(g => g.path === location.pathname);

  // User dropdown: click-based
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const NAV = [
    { path:"/leaderboard", label:"RANKS"   },
    { path:"/rewards",     label:"REWARDS" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glow-border-top w-full" />
      <div className="border-b backdrop-blur-2xl"
        style={{ background:"hsl(222 25% 5% / 0.88)", borderColor:"hsl(222 18% 11%)" }}>
        <div className="flex items-center px-4 gap-2" style={{ height:52 }}>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 mr-1">
            <div className="w-7 h-7 rounded flex items-center justify-center glow-teal shrink-0"
              style={{ background:"linear-gradient(135deg, hsl(168 82% 36%), hsl(178 88% 30%))" }}>
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <path d="M8 2 L14 6 L14 10 L8 14 L2 10 L2 6 Z" stroke="hsl(222 25% 5%)" strokeWidth="1.2" fill="hsl(168 82% 50% / 0.25)"/>
                <path d="M8 5 L11 7 L11 9 L8 11 L5 9 L5 7 Z" fill="hsl(222 25% 5%)" opacity="0.8"/>
              </svg>
            </div>
            <span className="font-display font-700 text-sm gradient-text tracking-widest hidden sm:block">PUMPZONE</span>
          </Link>

          {/* ── Games dropdown — CSS hover, zero JS delay ── */}
          <div className="relative group/games">
            {/* Trigger */}
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-display font-600 tracking-widest border transition-colors ${
                currentGame
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "text-muted-foreground hover:text-foreground border-transparent hover:bg-white/5"
              }`}>
              {currentGame ? (
                <><span className="w-4 h-4 shrink-0"><GameIcon id={currentGame.id} className="w-full h-full"/></span>
                {currentGame.name.toUpperCase()}</>
              ) : "CASINO"}
              <ChevronDown className="w-3 h-3 transition-transform duration-150 group-hover/games:rotate-180"/>
            </button>

            {/* Dropdown — pure CSS show/hide via group-hover */}
            <div
              className="absolute left-0 mt-1 w-[520px] max-w-[90vw] rounded-xl overflow-hidden z-50
                         opacity-0 invisible translate-y-1
                         group-hover/games:opacity-100 group-hover/games:visible group-hover/games:translate-y-0
                         transition-all duration-150 ease-out"
              style={{
                background:"hsl(222 22% 7% / 0.98)",
                border:"1px solid hsl(222 18% 14%)",
                boxShadow:"0 20px 60px hsl(0 0% 0% / 0.7), 0 0 0 1px hsl(168 82% 42% / 0.06)",
                backdropFilter:"blur(16px)",
              }}>

              {/* Top bar */}
              <div className="px-4 py-2.5 border-b flex items-center justify-between"
                style={{ borderColor:"hsl(222 18% 12%)" }}>
                <span className="text-[9px] font-display font-700 tracking-widest text-muted-foreground/70 uppercase">Games</span>
                <div className="live-badge">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"/>LIVE
                </div>
              </div>

              {/* Categories */}
              <div className="grid grid-cols-3">
                {GAME_CATEGORIES.map((cat, ci) => (
                  <div key={cat.label}
                    className={`p-3 space-y-0.5 ${ci < 2 ? "border-r" : ""}`}
                    style={{ borderColor:"hsl(222 18% 11%)" }}>
                    <p className="text-[8px] font-display font-700 tracking-widest text-muted-foreground/50 uppercase mb-2 px-2">
                      {cat.label}
                    </p>
                    {cat.games.map(g => {
                      const isActive = location.pathname === g.path;
                      return (
                        <Link key={g.path} to={g.path}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-display font-600 tracking-wide transition-colors group/item ${
                            isActive
                              ? "bg-primary/15 text-primary border border-primary/25"
                              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                          }`}>
                          <span className="w-5 h-5 shrink-0 opacity-70 group-hover/item:opacity-100 transition-opacity">
                            <GameIcon id={g.id} className="w-full h-full"/>
                          </span>
                          <span className="flex-1">{g.name}</span>
                          {g.tag && <span className={`text-[8px] font-700 ${g.tagColor}`}>{g.tag}</span>}
                          {isActive && <ChevronRight className="w-3 h-3 text-primary shrink-0"/>}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t" style={{ borderColor:"hsl(222 18% 11%)", background:"hsl(222 25% 6% / 0.5)" }}>
                <span className="text-[9px] text-muted-foreground/40 font-body">⚡ All games provably fair on Solana</span>
              </div>
            </div>
          </div>

          {/* Other nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.map(({ path, label }) => {
              const active = location.pathname === path;
              return (
                <Link key={path} to={path}
                  className={`px-3 py-1.5 text-[11px] font-display font-600 tracking-widest rounded border transition-colors ${
                    active ? "bg-primary/12 text-primary border-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-white/4 border-transparent"
                  }`}>{label}</Link>
              );
            })}
          </nav>

          {/* Right */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {isBeta ? (
              <button onClick={onOpenWaitlist}
                className="px-3 py-1.5 text-[10px] font-display font-600 tracking-widest rounded border border-warning/30 text-warning bg-warning/8 hover:bg-warning/15 transition-colors">
                ⏳ BETA
              </button>
            ) : user && profile ? (
              <div className="relative" ref={dropRef}>
                <button onClick={() => setDropOpen(p => !p)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded border transition-all hover:border-primary/30"
                  style={{ background:"hsl(222 22% 8%)", borderColor:"hsl(222 18% 14%)" }}>
                  <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-display font-700 shrink-0"
                    style={{ background:"linear-gradient(135deg, hsl(168 82% 36%), hsl(178 88% 30%))", color:"hsl(222 25% 5%)" }}>
                    {profile.username[0]?.toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[10px] font-display font-600 leading-none">{profile.username}</p>
                    <p className="text-[9px] text-primary leading-none mt-0.5">{profile.casino_balance.toFixed(4)} SOL</p>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform shrink-0 ${dropOpen ? "rotate-180" : ""}`}/>
                </button>

                <AnimatePresence>
                  {dropOpen && (
                    <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:4}}
                      transition={{duration:0.1}}
                      className="absolute right-0 mt-1.5 w-44 rounded-lg overflow-hidden z-50"
                      style={{ background:"hsl(222 22% 8%)", border:"1px solid hsl(222 18% 14%)", boxShadow:"0 16px 48px hsl(0 0% 0% / 0.6)" }}>
                      <div className="p-2.5 border-b" style={{ borderColor:"hsl(222 18% 12%)" }}>
                        <p className="text-[10px] font-display font-600">{profile.username}</p>
                        <p className="text-[9px] text-muted-foreground font-body truncate mt-0.5">{profile.email}</p>
                      </div>
                      <div className="p-1">
                        {[{to:"/profile",icon:User,label:"Profile"},{to:"/rewards",icon:Gift,label:"Rewards"},{to:"/profile#history",icon:History,label:"History"},{to:"/profile#wallet",icon:Wallet,label:"Wallet"}].map(item=>(
                          <Link key={item.label} to={item.to} onClick={()=>setDropOpen(false)}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-body text-muted-foreground hover:text-primary hover:bg-primary/6 rounded transition-colors">
                            <item.icon className="w-3.5 h-3.5"/>{item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="p-1 border-t" style={{ borderColor:"hsl(222 18% 12%)" }}>
                        <button onClick={()=>{signOut();setDropOpen(false);}}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-body text-destructive hover:bg-destructive/8 rounded transition-colors">
                          <LogOut className="w-3.5 h-3.5"/>Disconnect
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)}
                className="px-4 py-1.5 text-[10px] font-display font-700 tracking-widest rounded transition-all hover:opacity-90"
                style={{ background:"linear-gradient(135deg, hsl(168 82% 38%), hsl(178 88% 32%))", color:"hsl(222 25% 5%)", boxShadow:"0 2px 12px hsl(168 82% 38% / 0.35)" }}>
                CONNECT
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
