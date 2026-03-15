// Fantasy-illustrated game cards — portrait cards with detailed SVG artwork
// Each card has: dark fantasy bg, glowing illustration, RTP badge, ornate border, title

interface GameCardProps {
  id: string;
  name: string;
  rtp?: string;
  tag?: string;
  onClick?: () => void;
}

// ── Ornate corner decoration ─────────────────────────────────────────────
const Corner = ({ flip }: { flip?: boolean }) => (
  <g transform={flip ? "scale(-1,1) translate(-24,0)" : ""}>
    <circle cx="6" cy="6" r="3" fill="none" stroke="rgba(255,215,100,0.7)" strokeWidth="0.8"/>
    <circle cx="6" cy="6" r="1.5" fill="rgba(255,215,100,0.5)"/>
    <line x1="9" y1="6" x2="22" y2="6" stroke="rgba(255,215,100,0.45)" strokeWidth="0.6"/>
    <line x1="6" y1="9" x2="6" y2="22" stroke="rgba(255,215,100,0.45)" strokeWidth="0.6"/>
  </g>
);

// ── Per-game SVG illustrations ──────────────────────────────────────────
const Illustrations: Record<string, () => JSX.Element> = {

  dice: () => (
    <div className="w-full h-full" style={{
      backgroundImage: "url('/game-dice.png')",
      backgroundSize: "cover",
      backgroundPosition: "center center",
    }}/>
  ),

  blackjack: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id="bj-bg" cx="50%" cy="60%"><stop offset="0%" stopColor="#1a1200"/><stop offset="100%" stopColor="#0a0800"/></radialGradient>
        <radialGradient id="bj-glow" cx="50%" cy="50%"><stop offset="0%" stopColor="#b8860b" stopOpacity="0.5"/><stop offset="100%" stopColor="transparent"/></radialGradient>
        <filter id="bj-blur"><feGaussianBlur stdDeviation="4"/></filter>
      </defs>
      <rect width="200" height="200" fill="url(#bj-bg)"/>
      {/* Stars */}
      {[[30,20],[80,15],[150,30],[185,90],[190,150],[10,120]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="0.8" fill="white" opacity="0.5"/>
      ))}
      {/* Gold glow behind cauldron */}
      <ellipse cx="100" cy="140" rx="50" ry="25" fill="url(#bj-glow)" filter="url(#bj-blur)"/>
      {/* Sun/rays */}
      {Array.from({length:12},(_,i)=>{
        const a = (i/12)*Math.PI*2, r1=28, r2=38;
        return <line key={i} x1={100+r1*Math.cos(a)} y1={100+r1*Math.sin(a)} x2={100+r2*Math.cos(a)} y2={100+r2*Math.sin(a)} stroke="rgba(184,134,11,0.6)" strokeWidth="1.5"/>;
      })}
      <circle cx="100" cy="100" r="26" fill="#1a1200" stroke="#b8860b" strokeWidth="1.5"/>
      {/* Cauldron */}
      <ellipse cx="100" cy="148" rx="32" ry="14" fill="#2a1f00" stroke="#b8860b" strokeWidth="1.5"/>
      <path d="M68 148 Q68 170 100 172 Q132 170 132 148 Z" fill="#1a1300" stroke="#b8860b" strokeWidth="1.5"/>
      <ellipse cx="100" cy="148" rx="32" ry="10" fill="#3d2c00" stroke="#d4a017" strokeWidth="1"/>
      {/* Card K */}
      <g transform="translate(72,55) rotate(-18)">
        <rect width="36" height="50" rx="4" fill="#fffef0" stroke="#d4a017" strokeWidth="1.5"/>
        <text x="5" y="14" fontSize="11" fill="#8b0000" fontFamily="serif" fontWeight="bold">K</text>
        <text x="18" y="30" fontSize="14" fill="#8b0000" fontFamily="serif" textAnchor="middle">♥</text>
        <text x="31" y="47" fontSize="11" fill="#8b0000" fontFamily="serif" fontWeight="bold" transform="rotate(180 18 44)">K</text>
      </g>
      {/* Card Q */}
      <g transform="translate(95,50) rotate(14)">
        <rect width="36" height="50" rx="4" fill="#fffef0" stroke="#d4a017" strokeWidth="1.5"/>
        <text x="5" y="14" fontSize="11" fill="#1a1a6e" fontFamily="serif" fontWeight="bold">Q</text>
        <text x="18" y="30" fontSize="14" fill="#1a1a6e" fontFamily="serif" textAnchor="middle">♠</text>
        <text x="31" y="47" fontSize="11" fill="#1a1a6e" fontFamily="serif" fontWeight="bold" transform="rotate(180 18 44)">Q</text>
      </g>
      {/* Gold mist */}
      <ellipse cx="100" cy="155" rx="45" ry="12" fill="#b8860b" opacity="0.2"/>
    </svg>
  ),

  plinko: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="plinko-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#001a1a"/><stop offset="100%" stopColor="#002a20"/></linearGradient>
        <radialGradient id="plinko-beam" cx="50%" cy="20%"><stop offset="0%" stopColor="#00ff88" stopOpacity="0.7"/><stop offset="100%" stopColor="transparent"/></radialGradient>
        <filter id="plinko-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="200" height="200" fill="url(#plinko-bg)"/>
      {/* Perspective tunnel walls */}
      <path d="M100 20 L20 180 L30 180 L100 35 L170 180 L180 180 Z" fill="rgba(0,180,100,0.06)"/>
      {/* Wall panels */}
      {[1,2,3,4].map(i=>(
        <g key={i}>
          <path d={`M${100-i*22} ${20+i*28} L${20} ${180}`} stroke="rgba(0,200,120,0.15)" strokeWidth="1"/>
          <path d={`M${100+i*22} ${20+i*28} L${180} ${180}`} stroke="rgba(0,200,120,0.15)" strokeWidth="1"/>
        </g>
      ))}
      {/* Plinko pins */}
      {[[100,45],[80,70],[120,70],[60,95],[100,95],[140,95],[40,120],[80,120],[120,120],[160,120]].map(([px,py],i)=>(
        <g key={i}>
          <circle cx={px} cy={py} r="4" fill="#00c878" filter="url(#plinko-glow)" opacity="0.9"/>
          <circle cx={px} cy={py} r="2" fill="#80ffcc"/>
        </g>
      ))}
      {/* Glowing ball */}
      <circle cx="100" cy="30" r="9" fill="none" stroke="#00ff88" strokeWidth="1" opacity="0.4"/>
      <circle cx="100" cy="30" r="7" fill="#003322" stroke="#00ff88" strokeWidth="1.5"/>
      <circle cx="100" cy="30" r="4" fill="#00ff88" opacity="0.9"/>
      <circle cx="97" cy="27" r="1.5" fill="white" opacity="0.6"/>
      {/* Beam of light from ball */}
      <path d="M88 40 L100 40 L112 40 L100 38 Z" fill="#00ff88" opacity="0.3"/>
      <ellipse cx="100" cy="50" rx="8" ry="20" fill="url(#plinko-beam)" opacity="0.5"/>
      {/* Bottom buckets */}
      {[25,55,85,115,145,175].map((bx,i)=>(
        <rect key={i} x={bx} y={155} width="20" height="25" rx="3"
          fill={i===0||i===5?"#8b0000":i===1||i===4?"#b8860b":"#006633"}
          stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"/>
      ))}
      {/* Stone arch at top */}
      <path d="M40 20 Q100 5 160 20 L155 30 Q100 18 45 30 Z" fill="#1a3a2a" stroke="rgba(0,200,120,0.4)" strokeWidth="1"/>
    </svg>
  ),

  crash: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id="cr-bg" cx="50%" cy="50%"><stop offset="0%" stopColor="#1a0a0a"/><stop offset="100%" stopColor="#0a0505"/></radialGradient>
        <radialGradient id="cr-nebula" cx="60%" cy="40%"><stop offset="0%" stopColor="#4a1a00" stopOpacity="0.8"/><stop offset="100%" stopColor="transparent"/></radialGradient>
        <filter id="cr-glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="200" height="200" fill="url(#cr-bg)"/>
      <ellipse cx="120" cy="80" rx="70" ry="50" fill="url(#cr-nebula)"/>
      {/* Stars */}
      {[[15,25],[40,10],[70,20],[150,15],[185,35],[180,100],[10,80],[30,150],[170,170]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%3===0?1.2:0.7} fill="white" opacity={0.3+i*0.07}/>
      ))}
      {/* Exhaust trail */}
      <path d="M60 145 Q50 150 35 160 Q45 148 55 140 Z" fill="#ff6600" opacity="0.7"/>
      <path d="M60 145 Q48 158 30 170 Q42 155 57 143 Z" fill="#ff4400" opacity="0.5"/>
      <ellipse cx="48" cy="158" rx="8" ry="4" fill="#ff8800" opacity="0.3"/>
      {/* Plane body */}
      <g transform="translate(65,95) rotate(-25)">
        {/* Fuselage */}
        <ellipse cx="35" cy="12" rx="38" ry="10" fill="#5a3a1a" stroke="#c8a060" strokeWidth="1.2"/>
        {/* Top wing */}
        <path d="M20 5 L45 -15 L55 -10 L30 7 Z" fill="#7a5030" stroke="#c8a060" strokeWidth="0.8"/>
        {/* Bottom wing */}
        <path d="M20 18 L45 35 L55 30 L30 16 Z" fill="#7a5030" stroke="#c8a060" strokeWidth="0.8"/>
        {/* Tail */}
        <path d="M-5 8 L-20 -5 L-15 10 Z" fill="#7a5030" stroke="#c8a060" strokeWidth="0.8"/>
        {/* Engine */}
        <circle cx="55" cy="11" r="9" fill="#3a2a10" stroke="#c8a060" strokeWidth="1.2"/>
        <circle cx="55" cy="11" r="5" fill="#2a1a08" stroke="#a07838" strokeWidth="0.8"/>
        {/* Propeller */}
        <line x1="67" y1="11" x2="73" y2="3" stroke="#c8a060" strokeWidth="2"/>
        <line x1="67" y1="11" x2="73" y2="19" stroke="#c8a060" strokeWidth="2"/>
        {/* Cockpit */}
        <ellipse cx="20" cy="6" rx="8" ry="5" fill="#1a3a5a" stroke="#60a0c0" strokeWidth="0.8"/>
        {/* Gear decorations */}
        <circle cx="0" cy="11" r="6" fill="none" stroke="#a07838" strokeWidth="1" strokeDasharray="2 2"/>
        <circle cx="0" cy="11" r="3" fill="#3a2a10" stroke="#a07838" strokeWidth="0.8"/>
      </g>
      {/* Speed lines */}
      {[[35,130],[25,140],[20,120]].map(([lx,ly],i)=>(
        <line key={i} x1={lx} y1={ly} x2={lx+25} y2={ly-8} stroke="rgba(255,150,50,0.4)" strokeWidth={1-i*0.2}/>
      ))}
      {/* Ground gears */}
      <circle cx="40" cy="175" r="12" fill="none" stroke="#a07838" strokeWidth="1.5" strokeDasharray="3 2"/>
      <circle cx="40" cy="175" r="5" fill="#3a2a10" stroke="#a07838"/>
      <circle cx="160" cy="168" r="9" fill="none" stroke="#a07838" strokeWidth="1.2" strokeDasharray="2 2"/>
      <circle cx="160" cy="168" r="3.5" fill="#3a2a10" stroke="#a07838"/>
    </svg>
  ),

  mines: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id="mn-bg" cx="50%" cy="50%"><stop offset="0%" stopColor="#0a0a1a"/><stop offset="100%" stopColor="#050508"/></radialGradient>
        <radialGradient id="mn-cave" cx="50%" cy="80%"><stop offset="0%" stopColor="#1a1a3a"/><stop offset="100%" stopColor="#050508"/></radialGradient>
        <filter id="mn-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="200" height="200" fill="url(#mn-bg)"/>
      {/* Stone arch/cave entrance */}
      <path d="M10 200 L10 90 Q50 20 100 15 Q150 20 190 90 L190 200 Z" fill="#1a1a2a"/>
      <path d="M25 200 L25 98 Q60 38 100 35 Q140 38 175 98 L175 200 Z" fill="#0d0d1a"/>
      {/* Cave walls texture */}
      {[[30,100],[35,130],[28,160],[172,105],[168,140],[174,168]].map(([wx,wy],i)=>(
        <path key={i} d={`M${wx} ${wy} L${wx+8} ${wy-5} L${wx+5} ${wy+8} Z`} fill="rgba(80,80,120,0.3)"/>
      ))}
      {/* Lightning bolt */}
      <g opacity="0.4">
        <path d="M95 40 L85 70 L93 70 L83 95 L97 95 L87 120" stroke="#6060ff" strokeWidth="2" fill="none"/>
      </g>
      {/* Large blue crystal cluster - center */}
      <g transform="translate(75,85)" filter="url(#mn-glow)">
        {/* Crystal 1 */}
        <path d="M25 70 L15 30 L25 5 L35 30 Z" fill="#1a6aff" stroke="#60b0ff" strokeWidth="1"/>
        <path d="M25 70 L15 30 L25 5" fill="#3080ff" opacity="0.5"/>
        {/* Crystal 2 */}
        <path d="M40 70 L30 35 L38 12 L48 35 Z" fill="#1a5aee" stroke="#50a0ff" strokeWidth="1"/>
        <path d="M40 70 L30 35 L38 12" fill="#2870ff" opacity="0.5"/>
        {/* Crystal 3 smaller */}
        <path d="M10 65 L5 42 L10 28 L17 42 Z" fill="#1a50dd" stroke="#4090ff" strokeWidth="0.8"/>
        {/* Crystal 4 */}
        <path d="M55 68 L48 40 L55 22 L62 40 Z" fill="#1a4acc" stroke="#3080ee" strokeWidth="0.8"/>
        {/* Shine */}
        <ellipse cx="25" cy="18" rx="4" ry="2" fill="white" opacity="0.4" transform="rotate(-20 25 18)"/>
        <ellipse cx="40" cy="22" rx="3" ry="1.5" fill="white" opacity="0.35" transform="rotate(-15 40 22)"/>
      </g>
      {/* Glowing particles */}
      {[[55,80],[145,95],[100,60],[130,130],[70,140]].map(([px,py],i)=>(
        <circle key={i} cx={px} cy={py} r={i%2===0?2:1.5} fill="#60b0ff" opacity={0.4+i*0.1} filter="url(#mn-glow)"/>
      ))}
      {/* Ground */}
      <path d="M10 190 Q100 175 190 190 L190 200 L10 200 Z" fill="#0a0a1a"/>
      {/* Mist at bottom */}
      <ellipse cx="100" cy="180" rx="70" ry="15" fill="#1a3060" opacity="0.3"/>
    </svg>
  ),

  slots: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id="sl-bg" cx="50%" cy="50%"><stop offset="0%" stopColor="#1a0a1a"/><stop offset="100%" stopColor="#080508"/></radialGradient>
        <linearGradient id="sl-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffd700"/><stop offset="100%" stopColor="#b8860b"/></linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#sl-bg)"/>
      {/* Slot machine body */}
      <rect x="30" y="45" width="140" height="120" rx="12" fill="#1a0a2a" stroke="#8b5cf6" strokeWidth="2"/>
      <rect x="30" y="45" width="140" height="35" rx="12" fill="#2d1a4a" stroke="#8b5cf6" strokeWidth="1.5"/>
      <rect x="30" y="68" width="140" height="12" fill="#1a0a2a"/>
      {/* Top text */}
      <text x="100" y="66" textAnchor="middle" fontSize="10" fill="#c084fc" fontFamily="sans-serif" fontWeight="bold">PUMPZONE SLOTS</text>
      {/* Reel windows */}
      {[50,95,140].map((rx,i)=>(
        <g key={i}>
          <rect x={rx} y="90" width="36" height="50" rx="5" fill="#0d0618" stroke="#7c3aed" strokeWidth="1.2"/>
          <text x={rx+18} y="122" textAnchor="middle" fontSize="24">{i===0?"7":i===1?"💎":"⭐"}</text>
        </g>
      ))}
      {/* Win line */}
      <line x1="40" y1="115" x2="160" y2="115" stroke="#ffd700" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7"/>
      {/* Lever */}
      <rect x="175" y="75" width="8" height="55" rx="4" fill="#7c3aed" stroke="#a855f7" strokeWidth="1"/>
      <circle cx="179" cy="75" r="7" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5"/>
      {/* Coins at bottom */}
      {[55,80,105,130].map((cx,i)=>(
        <ellipse key={i} cx={cx} cy="175" rx="12" ry="7" fill="url(#sl-gold)" stroke="#ffd700" strokeWidth="0.8" transform={`rotate(${i*5-8} ${cx} 175)`}/>
      ))}
      {/* Glow */}
      <rect x="30" y="45" width="140" height="120" rx="12" fill="none" stroke="#c084fc" strokeWidth="0.5" opacity="0.4"/>
    </svg>
  ),

  roulette: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id="rl-bg" cx="50%" cy="50%"><stop offset="0%" stopColor="#0a1a0a"/><stop offset="100%" stopColor="#050a05"/></radialGradient>
        <radialGradient id="rl-glow" cx="50%" cy="50%"><stop offset="0%" stopColor="#00c878" stopOpacity="0.4"/><stop offset="100%" stopColor="transparent"/></radialGradient>
        <filter id="rl-blur"><feGaussianBlur stdDeviation="4"/></filter>
      </defs>
      <rect width="200" height="200" fill="url(#rl-bg)"/>
      {/* Background castle silhouette */}
      <g fill="#0a1a0a" stroke="rgba(0,200,120,0.15)" strokeWidth="1">
        {/* Towers */}
        <rect x="20" y="80" width="30" height="80"/>
        <rect x="25" y="68" width="8" height="15"/><rect x="37" y="68" width="8" height="15"/>
        <rect x="150" y="75" width="30" height="85"/>
        <rect x="153" y="63" width="8" height="15"/><rect x="165" y="63" width="8" height="15"/>
        <rect x="75" y="95" width="50" height="65"/>
        <rect x="78" y="82" width="8" height="16"/><rect x="91" y="82" width="8" height="16"/><rect x="104" y="82" width="8" height="16"/>
        {/* Turret tops */}
        <path d="M20 80 Q35 60 50 80" fill="#0a1a10"/>
        <path d="M75 95 Q100 72 125 95" fill="#0a1a10"/>
        <path d="M150 75 Q165 55 180 75" fill="#0a1a10"/>
      </g>
      {/* Roulette table glow */}
      <ellipse cx="100" cy="160" rx="70" ry="25" fill="url(#rl-glow)" filter="url(#rl-blur)"/>
      {/* Roulette wheel */}
      <circle cx="100" cy="118" r="45" fill="#0a2a0a" stroke="#00c878" strokeWidth="2"/>
      {/* Segments */}
      {Array.from({length:12},(_,i)=>{
        const a1=(i/12)*Math.PI*2-Math.PI/2, a2=((i+1)/12)*Math.PI*2-Math.PI/2;
        const r=42;
        const x1=100+r*Math.cos(a1),y1=118+r*Math.sin(a1);
        const x2=100+r*Math.cos(a2),y2=118+r*Math.sin(a2);
        return <path key={i} d={`M100 118 L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`}
          fill={i%2===0?"#1a0000":"#0a0a0a"} stroke="rgba(0,200,120,0.3)" strokeWidth="0.5"/>;
      })}
      <circle cx="100" cy="118" r="28" fill="#0a2a0a" stroke="#00c878" strokeWidth="1.5"/>
      <circle cx="100" cy="118" r="14" fill="#0d1a0d" stroke="#00c878" strokeWidth="1.2"/>
      <circle cx="100" cy="118" r="5" fill="#00c878"/>
      {/* Glowing ball */}
      <circle cx="130" cy="100" r="5" fill="white" stroke="#00ff88" strokeWidth="1" filter="url(#rl-blur)"/>
      <circle cx="130" cy="100" r="3" fill="white"/>
      {/* Table numbers strip */}
      <rect x="40" y="168" width="120" height="20" rx="4" fill="#1a3a1a" stroke="#00c878" strokeWidth="1"/>
      {[0,1,2,3,4].map(i=>(
        <rect key={i} x={44+i*23} y="171" width="20" height="14" rx="2" fill={i===0?"#006600":i%2===0?"#660000":"#0a0a0a"} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
      ))}
    </svg>
  ),

  hilo: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id="hl-bg" cx="50%" cy="50%"><stop offset="0%" stopColor="#0a1a2a"/><stop offset="100%" stopColor="#050a10"/></radialGradient>
        <filter id="hl-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="200" height="200" fill="url(#hl-bg)"/>
      {/* Galaxy/nebula bg */}
      <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(100,150,255,0.05)"/>
      <ellipse cx="80" cy="90" rx="40" ry="25" fill="rgba(80,100,200,0.08)" transform="rotate(-30 80 90)"/>
      {/* Stars */}
      {[[20,30],[50,15],[150,25],[185,60],[175,145],[30,160],[100,10]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={0.6+i*0.15} fill="white" opacity="0.5"/>
      ))}
      {/* Cards fanned */}
      <g transform="translate(55,60) rotate(-22)">
        <rect width="52" height="72" rx="6" fill="#fffef5" stroke="#c0c0c0" strokeWidth="1"/>
        <text x="7" y="18" fontSize="13" fill="#cc0000" fontFamily="serif" fontWeight="bold">A</text>
        <text x="26" y="42" fontSize="18" fill="#cc0000" fontFamily="serif" textAnchor="middle">♥</text>
        <text x="45" y="68" fontSize="13" fill="#cc0000" fontFamily="serif" fontWeight="bold" transform="rotate(180 26 64)">A</text>
        {/* Shine */}
        <rect x="5" y="5" width="20" height="35" rx="3" fill="white" opacity="0.15"/>
      </g>
      <g transform="translate(85,55) rotate(8)">
        <rect width="52" height="72" rx="6" fill="#fffef5" stroke="#c0c0c0" strokeWidth="1.2"/>
        <text x="7" y="18" fontSize="13" fill="#1a1a1a" fontFamily="serif" fontWeight="bold">K</text>
        <text x="26" y="42" fontSize="18" fill="#1a1a1a" fontFamily="serif" textAnchor="middle">♠</text>
        <text x="45" y="68" fontSize="13" fill="#1a1a1a" fontFamily="serif" fontWeight="bold" transform="rotate(180 26 64)">K</text>
        <rect x="5" y="5" width="20" height="35" rx="3" fill="white" opacity="0.12"/>
      </g>
      {/* Arrow up */}
      <g filter="url(#hl-glow)" opacity="0.9">
        <path d="M145 90 L155 65 L165 90 L160 90 L160 115 L150 115 L150 90 Z" fill="#22c55e" stroke="#4ade80" strokeWidth="0.8"/>
      </g>
      {/* Arrow down */}
      <g filter="url(#hl-glow)" opacity="0.9">
        <path d="M145 120 L155 145 L165 120 L160 120 L160 95 L150 95 L150 120 Z" fill="#ef4444" stroke="#f87171" strokeWidth="0.8"/>
      </g>
      {/* Question mark glow in center */}
      <text x="157" y="113" textAnchor="middle" fontSize="18" fill="rgba(255,255,255,0.15)" fontFamily="sans-serif" fontWeight="bold">?</text>
    </svg>
  ),

  towers: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id="tw-bg" cx="50%" cy="50%"><stop offset="0%" stopColor="#1a1a0a"/><stop offset="100%" stopColor="#080808"/></radialGradient>
        <linearGradient id="tw-gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#b8860b"/><stop offset="50%" stopColor="#ffd700"/><stop offset="100%" stopColor="#b8860b"/></linearGradient>
        <filter id="tw-glow"><feGaussianBlur stdDeviation="2.5"/></filter>
      </defs>
      <rect width="200" height="200" fill="url(#tw-bg)"/>
      {/* Background clouds/fog */}
      <ellipse cx="50" cy="130" rx="40" ry="15" fill="rgba(100,80,20,0.15)"/>
      <ellipse cx="155" cy="140" rx="35" ry="12" fill="rgba(100,80,20,0.12)"/>
      {/* Tower structure */}
      {/* Level 1 - widest */}
      <rect x="30" y="155" width="140" height="28" rx="4" fill="#1a1500" stroke="url(#tw-gold)" strokeWidth="1.5"/>
      <g fill="rgba(255,215,0,0.15)">
        {[45,75,105,135].map(px=><rect key={px} x={px} y="158" width="16" height="22" rx="2"/>)}
      </g>
      {/* Level 2 */}
      <rect x="48" y="122" width="104" height="32" rx="4" fill="#1a1400" stroke="url(#tw-gold)" strokeWidth="1.5"/>
      <g fill="rgba(255,215,0,0.12)">
        {[60,88,116].map(px=><rect key={px} x={px} y="125" width="16" height="26" rx="2"/>)}
      </g>
      {/* Level 3 */}
      <rect x="65" y="92" width="70" height="29" rx="4" fill="#1a1300" stroke="url(#tw-gold)" strokeWidth="1.5"/>
      <g fill="rgba(255,215,0,0.1)">
        {[75,100].map(px=><rect key={px} x={px} y="95" width="14" height="23" rx="2"/>)}
      </g>
      {/* Level 4 */}
      <rect x="78" y="65" width="44" height="27" rx="4" fill="#1a1200" stroke="url(#tw-gold)" strokeWidth="1.5"/>
      <rect x="88" y="68" width="24" height="21" rx="2" fill="rgba(255,215,0,0.08)"/>
      {/* Top pinnacle */}
      <rect x="88" y="42" width="24" height="23" rx="3" fill="#1a1100" stroke="url(#tw-gold)" strokeWidth="1.5"/>
      <path d="M88 42 L100 22 L112 42 Z" fill="#2a1f00" stroke="#ffd700" strokeWidth="1.2"/>
      {/* Flag */}
      <line x1="100" y1="22" x2="100" y2="8" stroke="#d4a017" strokeWidth="1.2"/>
      <path d="M100 8 L114 12 L100 16 Z" fill="#ef4444"/>
      {/* Glow dots on levels (safe tiles) */}
      {[[55,169],[95,169],[45,136],[100,136],[68,106],[116,106],[82,79],[95,79]].map(([gx,gy],i)=>(
        <circle key={i} cx={gx} cy={gy} r="3" fill="#22c55e" filter="url(#tw-glow)" opacity="0.7"/>
      ))}
      {/* Dangerous tile indicator */}
      <circle cx="145" cy="136" r="3" fill="#ef4444" filter="url(#tw-glow)" opacity="0.7"/>
      {/* Gold glow at top */}
      <circle cx="100" cy="12" r="4" fill="#ffd700" filter="url(#tw-glow)" opacity="0.6"/>
    </svg>
  ),

  baccarat: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id="bc-bg" cx="50%" cy="50%"><stop offset="0%" stopColor="#0a1a0a"/><stop offset="100%" stopColor="#050805"/></radialGradient>
        <radialGradient id="bc-felt" cx="50%" cy="50%"><stop offset="0%" stopColor="#1a4a1a"/><stop offset="100%" stopColor="#0d2e0d"/></radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#bc-bg)"/>
      {/* Felt table */}
      <ellipse cx="100" cy="145" rx="80" ry="40" fill="url(#bc-felt)" stroke="#2a6a2a" strokeWidth="1.5"/>
      <ellipse cx="100" cy="145" rx="72" ry="34" fill="none" stroke="#1a5a1a" strokeWidth="0.8"/>
      {/* Table text */}
      <text x="100" y="165" textAnchor="middle" fontSize="7" fill="rgba(100,200,100,0.4)" fontFamily="sans-serif" letterSpacing="2">BACCARAT</text>
      {/* Player label */}
      <text x="65" y="135" textAnchor="middle" fontSize="8" fill="rgba(100,180,255,0.7)" fontFamily="sans-serif" fontWeight="bold">PLAYER</text>
      {/* Banker label */}
      <text x="135" y="135" textAnchor="middle" fontSize="8" fill="rgba(255,100,100,0.7)" fontFamily="sans-serif" fontWeight="bold">BANKER</text>
      {/* Player cards */}
      <g transform="translate(35,70) rotate(-10)">
        <rect width="38" height="52" rx="4" fill="#fffef0" stroke="#aaa" strokeWidth="0.8"/>
        <text x="5" y="14" fontSize="10" fill="#cc0000" fontFamily="serif" fontWeight="bold">8</text>
        <text x="19" y="32" fontSize="14" fill="#cc0000" fontFamily="serif" textAnchor="middle">♥</text>
      </g>
      <g transform="translate(62,65) rotate(5)">
        <rect width="38" height="52" rx="4" fill="#fffef0" stroke="#aaa" strokeWidth="0.8"/>
        <text x="5" y="14" fontSize="10" fill="#1a1a1a" fontFamily="serif" fontWeight="bold">K</text>
        <text x="19" y="32" fontSize="14" fill="#1a1a1a" fontFamily="serif" textAnchor="middle">♠</text>
      </g>
      {/* Banker cards */}
      <g transform="translate(105,68) rotate(-6)">
        <rect width="38" height="52" rx="4" fill="#fffef0" stroke="#aaa" strokeWidth="0.8"/>
        <text x="5" y="14" fontSize="10" fill="#cc0000" fontFamily="serif" fontWeight="bold">9</text>
        <text x="19" y="32" fontSize="14" fill="#cc0000" fontFamily="serif" textAnchor="middle">♦</text>
      </g>
      <g transform="translate(130,72) rotate(8)">
        <rect width="38" height="52" rx="4" fill="#fffef0" stroke="#aaa" strokeWidth="0.8"/>
        <text x="5" y="14" fontSize="10" fill="#1a1a1a" fontFamily="serif" fontWeight="bold">A</text>
        <text x="19" y="32" fontSize="14" fill="#1a1a1a" fontFamily="serif" textAnchor="middle">♣</text>
      </g>
      {/* "NATURAL 9" winner indicator */}
      <rect x="80" y="38" width="40" height="18" rx="9" fill="#cc0000" stroke="#ff6060" strokeWidth="1"/>
      <text x="100" y="50" textAnchor="middle" fontSize="7" fill="white" fontFamily="sans-serif" fontWeight="bold">NATURAL 9</text>
      {/* Stars */}
      {[[20,20],[180,25],[15,160],[185,155]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="0.8" fill="white" opacity="0.4"/>
      ))}
    </svg>
  ),

  coinflip: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id="cf-bg" cx="50%" cy="50%"><stop offset="0%" stopColor="#1a1200"/><stop offset="100%" stopColor="#0a0800"/></radialGradient>
        <radialGradient id="cf-coin" cx="35%" cy="35%"><stop offset="0%" stopColor="#ffe87c"/><stop offset="100%" stopColor="#b8860b"/></radialGradient>
        <filter id="cf-glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="200" height="200" fill="url(#cf-bg)"/>
      {/* Stars */}
      {[[25,20],[80,10],[160,18],[190,80],[185,155],[15,140],[100,5]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={0.6+i*0.12} fill="white" opacity="0.4"/>
      ))}
      {/* Coin glow */}
      <circle cx="100" cy="95" r="55" fill="#b8860b" opacity="0.15" filter="url(#cf-glow)"/>
      {/* Shadow */}
      <ellipse cx="100" cy="162" rx="40" ry="10" fill="#b8860b" opacity="0.2"/>
      {/* Main coin */}
      <circle cx="100" cy="95" r="52" fill="url(#cf-coin)" stroke="#ffd700" strokeWidth="3"/>
      <circle cx="100" cy="95" r="46" fill="none" stroke="#d4a017" strokeWidth="1.5"/>
      <circle cx="100" cy="95" r="40" fill="none" stroke="#b8860b" strokeWidth="0.8"/>
      {/* SOL symbol */}
      <text x="100" y="105" textAnchor="middle" fontSize="36" fill="#8a6000" fontFamily="sans-serif" fontWeight="900" opacity="0.9">◎</text>
      {/* Shine */}
      <ellipse cx="82" cy="76" rx="14" ry="8" fill="white" opacity="0.2" transform="rotate(-35 82 76)"/>
      {/* Edge highlights */}
      <circle cx="100" cy="95" r="52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
      {/* Sparkles */}
      {[[155,45],[45,55],[160,145]].map(([sx,sy],i)=>(
        <g key={i} transform={`translate(${sx},${sy})`} opacity="0.6">
          <line x1="0" y1="-7" x2="0" y2="7" stroke="#ffd700" strokeWidth="1"/>
          <line x1="-7" y1="0" x2="7" y2="0" stroke="#ffd700" strokeWidth="1"/>
          <line x1="-5" y1="-5" x2="5" y2="5" stroke="#ffd700" strokeWidth="0.6"/>
          <line x1="5" y1="-5" x2="-5" y2="5" stroke="#ffd700" strokeWidth="0.6"/>
        </g>
      ))}
    </svg>
  ),

  keno: () => (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id="kn-bg" cx="50%" cy="50%"><stop offset="0%" stopColor="#1a1000"/><stop offset="100%" stopColor="#0a0800"/></radialGradient>
        <radialGradient id="kn-stone" cx="40%" cy="35%"><stop offset="0%" stopColor="#c87c30"/><stop offset="100%" stopColor="#7a4010"/></radialGradient>
        <filter id="kn-glow"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <rect width="200" height="200" fill="url(#kn-bg)"/>
      {/* Stone tablet background */}
      <rect x="20" y="25" width="160" height="145" rx="10" fill="#3d2008" stroke="#7a4818" strokeWidth="2"/>
      <rect x="25" y="30" width="150" height="135" rx="8" fill="#4a2a0a" stroke="#8a5820" strokeWidth="1"/>
      {/* Keno grid 4x5 */}
      {Array.from({length:20},(_,i)=>{
        const col = i%5, row = Math.floor(i/5);
        const highlighted = [2,4,7,11,13,17].includes(i);
        const px = 35+col*30, py = 42+row*30;
        return (
          <g key={i}>
            <rect x={px} y={py} width="22" height="22" rx="3"
              fill={highlighted?"#b8680a":"#2a1505"}
              stroke={highlighted?"#ffd700":"#5a3010"} strokeWidth="0.8"/>
            {highlighted && <rect x={px} y={py} width="22" height="22" rx="3" fill="url(#kn-stone)"/>}
            <text x={px+11} y={py+15} textAnchor="middle" fontSize="7.5"
              fill={highlighted?"#fffef0":"#7a5030"} fontFamily="monospace" fontWeight="bold">
              {i*3+3}
            </text>
            {highlighted && (
              <circle cx={px+18} cy={py+4} r="4" fill="#22c55e" stroke="#4ade80" strokeWidth="0.8" filter="url(#kn-glow)"/>
            )}
          </g>
        );
      })}
      {/* Gold gem decoration */}
      <path d="M100 180 L107 172 L100 168 L93 172 Z" fill="#ffd700" stroke="#b8860b" strokeWidth="0.8"/>
      <path d="M40 178 L46 172 L40 168 L34 172 Z" fill="#22c55e" stroke="#15803d" strokeWidth="0.8"/>
      <path d="M160 178 L166 172 L160 168 L154 172 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="0.8"/>
    </svg>
  ),
};

// ── Ornate card frame ─────────────────────────────────────────────────────
const FRAME_COLORS: Record<string, { border: string; corner: string; glow: string; badge: string }> = {
  dice:      { border:"#8b5cf6,#6d28d9", corner:"#c084fc", glow:"rgba(139,92,246,0.4)", badge:"#7c3aed" },
  blackjack: { border:"#d4a017,#b8860b", corner:"#ffd700", glow:"rgba(212,160,23,0.4)", badge:"#92400e" },
  plinko:    { border:"#059669,#047857", corner:"#34d399", glow:"rgba(5,150,105,0.4)",  badge:"#065f46" },
  crash:     { border:"#b45309,#92400e", corner:"#fbbf24", glow:"rgba(180,83,9,0.4)",   badge:"#78350f" },
  mines:     { border:"#1d4ed8,#1e3a8a", corner:"#60a5fa", glow:"rgba(29,78,216,0.4)",  badge:"#1e3a8a" },
  slots:     { border:"#7c3aed,#6d28d9", corner:"#a78bfa", glow:"rgba(124,58,237,0.4)", badge:"#5b21b6" },
  roulette:  { border:"#047857,#065f46", corner:"#6ee7b7", glow:"rgba(4,120,87,0.4)",   badge:"#064e3b" },
  hilo:      { border:"#1d4ed8,#1e40af", corner:"#93c5fd", glow:"rgba(29,78,216,0.35)", badge:"#1e3a8a" },
  towers:    { border:"#92400e,#78350f", corner:"#fcd34d", glow:"rgba(146,64,14,0.4)",  badge:"#78350f" },
  baccarat:  { border:"#065f46,#064e3b", corner:"#6ee7b7", glow:"rgba(6,95,70,0.4)",    badge:"#064e3b" },
  coinflip:  { border:"#b45309,#92400e", corner:"#fde68a", glow:"rgba(180,83,9,0.4)",   badge:"#78350f" },
  keno:      { border:"#92400e,#78350f", corner:"#fcd34d", glow:"rgba(146,64,14,0.4)",  badge:"#78350f" },
};

// Games that provide their own complete card image (no extra frame/overlay needed)
const CUSTOM_CARD_IMAGES: Record<string, string> = {
  dice: "/game-dice.png",
};

const GameCard = ({ id, name, rtp = "100% RTP", tag, onClick }: GameCardProps) => {
  const customImage = CUSTOM_CARD_IMAGES[id];

  // ── Full image card: image already includes frame, title, gems ──────
  if (customImage) {
    return (
      <div
        onClick={onClick}
        className="relative cursor-pointer select-none"
        style={{
          aspectRatio: "3/4",
          borderRadius: 8,
          overflow: "hidden",
          transition: "transform 0.18s ease, filter 0.18s ease",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-6px) scale(1.03)";
          el.style.filter = "brightness(1.1) drop-shadow(0 12px 28px rgba(139,92,246,0.55))";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "";
          el.style.filter = "";
        }}>
        <img
          src={customImage}
          alt={name}
          className="w-full h-full"
          style={{ objectFit: "cover", objectPosition: "center", display: "block" }}
        />
        {tag && (
          <div className="absolute top-3 right-3 z-10">
            <span className="px-1.5 py-0.5 rounded text-[8px] font-display font-700 bg-red-500/80 text-white border border-red-400/50">
              {tag}
            </span>
          </div>
        )}
      </div>
    );
  }

  const Illustration = Illustrations[id];
  const frame = FRAME_COLORS[id] || FRAME_COLORS.blackjack;
  const [b1, b2] = frame.border.split(",");

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer select-none"
      style={{
        aspectRatio: "3/4",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: `0 0 0 2px ${b1}, 0 0 0 3px ${b2}, 0 8px 32px ${frame.glow}`,
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
      className="game-card-wrap"
      style={{
        ...({
          "--card-shadow": `0 0 0 2px ${b1}, 0 0 0 3px ${b2}, 0 8px 32px ${frame.glow}`,
        } as any),
      }}>

      {/* Illustration */}
      <div className="absolute inset-0">
        {Illustration ? <Illustration /> : <div className="w-full h-full" style={{ background:"hsl(222 22% 8%)" }}/>}
      </div>

      {/* Corner ornaments */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 133" preserveAspectRatio="none">
        {/* TL */}
        <g><circle cx="6" cy="6" r="3" fill="none" stroke={frame.corner} strokeWidth="0.8" opacity="0.8"/><circle cx="6" cy="6" r="1.2" fill={frame.corner} opacity="0.6"/><line x1="9" y1="6" x2="20" y2="6" stroke={frame.corner} strokeWidth="0.6" opacity="0.5"/><line x1="6" y1="9" x2="6" y2="20" stroke={frame.corner} strokeWidth="0.6" opacity="0.5"/></g>
        {/* TR */}
        <g><circle cx="94" cy="6" r="3" fill="none" stroke={frame.corner} strokeWidth="0.8" opacity="0.8"/><circle cx="94" cy="6" r="1.2" fill={frame.corner} opacity="0.6"/><line x1="91" y1="6" x2="80" y2="6" stroke={frame.corner} strokeWidth="0.6" opacity="0.5"/><line x1="94" y1="9" x2="94" y2="20" stroke={frame.corner} strokeWidth="0.6" opacity="0.5"/></g>
        {/* BL */}
        <g><circle cx="6" cy="127" r="3" fill="none" stroke={frame.corner} strokeWidth="0.8" opacity="0.8"/><circle cx="6" cy="127" r="1.2" fill={frame.corner} opacity="0.6"/><line x1="9" y1="127" x2="20" y2="127" stroke={frame.corner} strokeWidth="0.6" opacity="0.5"/><line x1="6" y1="124" x2="6" y2="113" stroke={frame.corner} strokeWidth="0.6" opacity="0.5"/></g>
        {/* BR */}
        <g><circle cx="94" cy="127" r="3" fill="none" stroke={frame.corner} strokeWidth="0.8" opacity="0.8"/><circle cx="94" cy="127" r="1.2" fill={frame.corner} opacity="0.6"/><line x1="91" y1="127" x2="80" y2="127" stroke={frame.corner} strokeWidth="0.6" opacity="0.5"/><line x1="94" y1="124" x2="94" y2="113" stroke={frame.corner} strokeWidth="0.6" opacity="0.5"/></g>
        {/* Top gem */}
        <path d="M48 2 L50 0 L52 2 L50 4 Z" fill={frame.corner} opacity="0.7"/>
        <path d="M48 131 L50 129 L52 131 L50 133 Z" fill={frame.corner} opacity="0.7"/>
      </svg>

      {/* RTP badge */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-display font-700 tracking-wider"
          style={{ background:`${frame.badge}dd`, border:`1px solid ${frame.corner}55`, color:"white" }}>
          {rtp}
        </span>
      </div>

      {/* HOT badge */}
      {tag && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="px-1.5 py-0.5 rounded text-[8px] font-display font-700 bg-red-500/80 text-white border border-red-400/50">
            {tag}
          </span>
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-2/5 pointer-events-none"
        style={{ background:"linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)" }}/>

      {/* Text */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10 text-center">
        <p className="font-display font-700 text-white leading-tight"
          style={{ fontSize:"clamp(0.75rem, 2.5vw, 1rem)", textShadow:"0 2px 8px rgba(0,0,0,0.8)" }}>
          {name}
        </p>
        <p className="text-[9px] font-body mt-0.5"
          style={{ color: frame.corner, opacity: 0.7 }}>PumpZone</p>
      </div>
    </div>
  );
};

export default GameCard;
