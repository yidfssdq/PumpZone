// Custom SVG game icons — hand-crafted, consistent style
// Each icon uses a 40x40 viewBox with the project's color palette

interface GameIconProps {
  id: string;
  className?: string;
  size?: number;
}

const icons: Record<string, (c: string) => JSX.Element> = {
  crash: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Rocket body */}
      <path d="M20 6 C20 6 14 14 14 22 L20 26 L26 22 C26 14 20 6 20 6Z" fill="hsl(263,70%,58%)" opacity="0.9"/>
      {/* Rocket window */}
      <circle cx="20" cy="18" r="3" fill="hsl(217,91%,75%)" opacity="0.8"/>
      {/* Rocket fins */}
      <path d="M14 22 L10 28 L16 26Z" fill="hsl(263,70%,48%)"/>
      <path d="M26 22 L30 28 L24 26Z" fill="hsl(263,70%,48%)"/>
      {/* Flame */}
      <path d="M17 26 Q20 34 23 26 Q21 30 20 28 Q19 30 17 26Z" fill="hsl(25,95%,53%)" opacity="0.9"/>
      {/* Crash line */}
      <path d="M6 34 L16 24" stroke="hsl(0,84%,60%)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
    </svg>
  ),

  blackjack: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Back card */}
      <rect x="16" y="10" width="16" height="22" rx="2.5" fill="hsl(233,40%,10%)" stroke="hsl(263,70%,58%)" strokeWidth="1"/>
      {/* Front card */}
      <rect x="8" y="8" width="16" height="22" rx="2.5" fill="hsl(233,40%,13%)" stroke="hsl(263,70%,58%)" strokeWidth="1.2"/>
      {/* A */}
      <text x="16" y="22" textAnchor="middle" fill="hsl(214,32%,91%)" fontSize="11" fontFamily="Orbitron,sans-serif" fontWeight="700">A</text>
      {/* Suit ♠ */}
      <text x="12" y="14" textAnchor="middle" fill="hsl(214,32%,91%)" fontSize="7">♠</text>
      {/* Back card K ♥ */}
      <text x="24" y="24" textAnchor="middle" fill="hsl(0,84%,60%)" fontSize="8" fontFamily="Orbitron,sans-serif" fontWeight="700">K</text>
      <text x="28" y="18" textAnchor="middle" fill="hsl(0,84%,60%)" fontSize="7">♥</text>
    </svg>
  ),

  mines: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Grid background */}
      <rect x="4" y="4" width="10" height="10" rx="1.5" fill="hsl(233,20%,14%)" stroke="hsl(0,0%,100%,0.08)" strokeWidth="0.8"/>
      <rect x="15" y="4" width="10" height="10" rx="1.5" fill="hsl(233,20%,14%)" stroke="hsl(0,0%,100%,0.08)" strokeWidth="0.8"/>
      <rect x="26" y="4" width="10" height="10" rx="1.5" fill="hsl(233,20%,14%)" stroke="hsl(0,0%,100%,0.08)" strokeWidth="0.8"/>
      <rect x="4" y="15" width="10" height="10" rx="1.5" fill="hsl(233,20%,14%)" stroke="hsl(0,0%,100%,0.08)" strokeWidth="0.8"/>
      {/* Diamond tile */}
      <rect x="15" y="15" width="10" height="10" rx="1.5" fill="hsl(217,91%,60%,0.3)" stroke="hsl(217,91%,60%)" strokeWidth="1"/>
      <path d="M20 17 L22.5 20 L20 23 L17.5 20Z" fill="hsl(217,91%,75%)"/>
      <rect x="26" y="15" width="10" height="10" rx="1.5" fill="hsl(233,20%,14%)" stroke="hsl(0,0%,100%,0.08)" strokeWidth="0.8"/>
      {/* Mine tile — exploding */}
      <rect x="4" y="26" width="10" height="10" rx="1.5" fill="hsl(0,84%,60%,0.2)" stroke="hsl(0,84%,60%)" strokeWidth="1"/>
      <circle cx="9" cy="31" r="3" fill="hsl(0,84%,60%)"/>
      {[0,45,90,135,180,225,270,315].map((a,i) => (
        <line key={i}
          x1={9 + 3.5 * Math.cos(a * Math.PI / 180)}
          y1={31 + 3.5 * Math.sin(a * Math.PI / 180)}
          x2={9 + 5 * Math.cos(a * Math.PI / 180)}
          y2={31 + 5 * Math.sin(a * Math.PI / 180)}
          stroke="hsl(0,84%,60%)" strokeWidth="1.2" strokeLinecap="round"/>
      ))}
      <rect x="15" y="26" width="10" height="10" rx="1.5" fill="hsl(233,20%,14%)" stroke="hsl(0,0%,100%,0.08)" strokeWidth="0.8"/>
      <rect x="26" y="26" width="10" height="10" rx="1.5" fill="hsl(233,20%,14%)" stroke="hsl(0,0%,100%,0.08)" strokeWidth="0.8"/>
    </svg>
  ),

  slots: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Machine body */}
      <rect x="3" y="6" width="34" height="28" rx="4" fill="hsl(233,40%,9%)" stroke="hsl(263,70%,58%)" strokeWidth="1.2"/>
      {/* Top bar */}
      <rect x="3" y="6" width="34" height="7" rx="4" fill="hsl(263,70%,40%)"/>
      <rect x="3" y="10" width="34" height="3" fill="hsl(263,70%,40%)"/>
      {/* 3 reels */}
      <rect x="7" y="17" width="7" height="10" rx="1.5" fill="hsl(233,20%,14%)" stroke="hsl(263,70%,58%,0.5)" strokeWidth="0.8"/>
      <rect x="16.5" y="17" width="7" height="10" rx="1.5" fill="hsl(233,20%,14%)" stroke="hsl(263,70%,58%,0.5)" strokeWidth="0.8"/>
      <rect x="26" y="17" width="7" height="10" rx="1.5" fill="hsl(233,20%,14%)" stroke="hsl(263,70%,58%,0.5)" strokeWidth="0.8"/>
      {/* Symbols */}
      <text x="10.5" y="25" textAnchor="middle" fontSize="8">7️⃣</text>
      <text x="20" y="25" textAnchor="middle" fontSize="8">7️⃣</text>
      <text x="29.5" y="25" textAnchor="middle" fontSize="8">7️⃣</text>
      {/* Win line */}
      <line x1="5" y1="22" x2="35" y2="22" stroke="hsl(25,95%,53%)" strokeWidth="0.8" strokeDasharray="2 1"/>
      {/* Lever */}
      <rect x="35" y="14" width="3" height="12" rx="1.5" fill="hsl(263,70%,48%)"/>
      <circle cx="36.5" cy="14" r="2.5" fill="hsl(0,84%,60%)"/>
    </svg>
  ),

  roulette: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Outer ring */}
      <circle cx="20" cy="20" r="17" fill="hsl(233,40%,9%)" stroke="hsl(263,70%,58%)" strokeWidth="1.2"/>
      {/* Colored segments (simplified) */}
      {[0,1,2,3,4,5,6,7,8].map(i => {
        const angle = (i / 9) * 2 * Math.PI - Math.PI / 2;
        const nextAngle = ((i + 1) / 9) * 2 * Math.PI - Math.PI / 2;
        const r = 13;
        const x1 = 20 + r * Math.cos(angle);
        const y1 = 20 + r * Math.sin(angle);
        const x2 = 20 + r * Math.cos(nextAngle);
        const y2 = 20 + r * Math.sin(nextAngle);
        const colors = ["hsl(0,84%,50%)","hsl(233,40%,20%)","hsl(0,84%,50%)","hsl(233,40%,20%)","hsl(160,84%,39%)","hsl(0,84%,50%)","hsl(233,40%,20%)","hsl(0,84%,50%)","hsl(233,40%,20%)"];
        return (
          <path key={i}
            d={`M20 20 L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`}
            fill={colors[i]}/>
        );
      })}
      {/* Inner circle */}
      <circle cx="20" cy="20" r="6" fill="hsl(233,40%,9%)" stroke="hsl(263,70%,58%)" strokeWidth="1"/>
      <circle cx="20" cy="20" r="2.5" fill="hsl(263,70%,58%)"/>
      {/* Ball */}
      <circle cx="20" cy="7" r="1.8" fill="white" opacity="0.9"/>
    </svg>
  ),

  plinko: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Ball */}
      <circle cx="20" cy="6" r="3" fill="hsl(263,70%,65%)"/>
      {/* Pins — triangle layout */}
      {[
        [20],
        [16.5, 23.5],
        [13, 20, 27],
        [9.5, 16.5, 23.5, 30.5],
        [6, 13, 20, 27, 34],
      ].map((row, ri) =>
        row.map((x, ci) => (
          <circle key={`${ri}-${ci}`} cx={x} cy={ri * 6 + 12} r="1.8"
            fill={ri === 4 ? "hsl(263,70%,58%)" : "hsl(214,32%,55%)"}/>
        ))
      )}
      {/* Buckets at bottom */}
      <rect x="3" y="35" width="6" height="3" rx="1" fill="hsl(0,84%,60%)"/>
      <rect x="11" y="35" width="5" height="3" rx="1" fill="hsl(25,95%,53%)"/>
      <rect x="18" y="35" width="4" height="3" rx="1" fill="hsl(214,32%,45%)"/>
      <rect x="24" y="35" width="5" height="3" rx="1" fill="hsl(25,95%,53%)"/>
      <rect x="31" y="35" width="6" height="3" rx="1" fill="hsl(0,84%,60%)"/>
    </svg>
  ),

  dice: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Main die */}
      <rect x="4" y="4" width="22" height="22" rx="4" fill="hsl(233,40%,11%)" stroke="hsl(263,70%,58%)" strokeWidth="1.2"/>
      <circle cx="10" cy="10" r="2" fill="hsl(263,70%,65%)"/>
      <circle cx="15" cy="15" r="2" fill="hsl(263,70%,65%)"/>
      <circle cx="20" cy="20" r="2" fill="hsl(263,70%,65%)"/>
      <circle cx="20" cy="10" r="2" fill="hsl(263,70%,65%)"/>
      <circle cx="10" cy="20" r="2" fill="hsl(263,70%,65%)"/>
      {/* Second die, offset */}
      <rect x="18" y="18" width="18" height="18" rx="4" fill="hsl(233,40%,13%)" stroke="hsl(217,91%,60%)" strokeWidth="1.2"/>
      <circle cx="24" cy="24" r="2" fill="hsl(217,91%,75%)"/>
      <circle cx="30" cy="30" r="2" fill="hsl(217,91%,75%)"/>
      <circle cx="30" cy="24" r="2" fill="hsl(217,91%,75%)"/>
      <circle cx="24" cy="30" r="2" fill="hsl(217,91%,75%)"/>
    </svg>
  ),

  hilo: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Left card */}
      <rect x="3" y="8" width="16" height="24" rx="2.5" fill="hsl(233,40%,11%)" stroke="hsl(263,70%,58%)" strokeWidth="1.2"/>
      <text x="11" y="23" textAnchor="middle" fill="hsl(214,32%,91%)" fontSize="12" fontFamily="Orbitron,sans-serif" fontWeight="700">A</text>
      <text x="7" y="14" textAnchor="middle" fill="hsl(214,32%,91%)" fontSize="7">♠</text>
      {/* Arrow up = higher */}
      <path d="M25 20 L28 14 L31 20" stroke="hsl(160,84%,39%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="28" y1="14" x2="28" y2="26" stroke="hsl(160,84%,39%)" strokeWidth="2" strokeLinecap="round"/>
      {/* Arrow down = lower */}
      <path d="M34 20 L37 26 L40 20" stroke="hsl(0,84%,60%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" clipPath="url(#clip1)"/>
      <line x1="37" y1="14" x2="37" y2="26" stroke="hsl(0,84%,60%)" strokeWidth="2" strokeLinecap="round" clipPath="url(#clip2)"/>
      {/* Simple up/down arrows instead */}
      <path d="M27 16 L30 12 L33 16" stroke="hsl(160,84%,39%)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M27 24 L30 28 L33 24" stroke="hsl(0,84%,60%)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),

  towers: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Tower levels */}
      <rect x="6" y="30" width="28" height="7" rx="2" fill="hsl(263,70%,40%)" stroke="hsl(263,70%,58%)" strokeWidth="0.8"/>
      <rect x="9" y="23" width="22" height="6" rx="2" fill="hsl(263,70%,45%)" stroke="hsl(263,70%,58%)" strokeWidth="0.8"/>
      <rect x="12" y="16" width="16" height="6" rx="2" fill="hsl(263,70%,50%)" stroke="hsl(263,70%,58%)" strokeWidth="0.8"/>
      <rect x="15" y="10" width="10" height="5" rx="2" fill="hsl(263,70%,55%)" stroke="hsl(263,70%,58%)" strokeWidth="0.8"/>
      {/* Top flag */}
      <line x1="20" y1="10" x2="20" y2="4" stroke="hsl(263,70%,70%)" strokeWidth="1.2"/>
      <path d="M20 4 L27 6.5 L20 9Z" fill="hsl(25,95%,53%)"/>
      {/* Safe/unsafe dots */}
      <circle cx="14" cy="33" r="1.5" fill="hsl(160,84%,39%)"/>
      <circle cx="20" cy="33" r="1.5" fill="hsl(0,84%,60%)"/>
      <circle cx="26" cy="33" r="1.5" fill="hsl(160,84%,39%)"/>
    </svg>
  ),

  baccarat: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Felt table arc */}
      <path d="M4 32 Q20 10 36 32Z" fill="hsl(160,60%,20%)" stroke="hsl(160,84%,39%)" strokeWidth="1"/>
      {/* Player cards */}
      <rect x="5" y="20" width="9" height="13" rx="1.5" fill="hsl(233,40%,13%)" stroke="hsl(217,91%,60%)" strokeWidth="1"/>
      <text x="9.5" y="29" textAnchor="middle" fill="hsl(217,91%,75%)" fontSize="7" fontFamily="Orbitron,sans-serif" fontWeight="700">8</text>
      {/* Banker cards */}
      <rect x="26" y="20" width="9" height="13" rx="1.5" fill="hsl(233,40%,13%)" stroke="hsl(0,84%,60%)" strokeWidth="1"/>
      <text x="30.5" y="29" textAnchor="middle" fill="hsl(0,84%,75%)" fontSize="7" fontFamily="Orbitron,sans-serif" fontWeight="700">9</text>
      {/* Labels */}
      <text x="9.5" y="19" textAnchor="middle" fill="hsl(217,91%,60%)" fontSize="5">P</text>
      <text x="30.5" y="19" textAnchor="middle" fill="hsl(0,84%,60%)" fontSize="5">B</text>
    </svg>
  ),

  coinflip: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* Coin body */}
      <ellipse cx="20" cy="20" rx="15" ry="15" fill="hsl(233,40%,11%)" stroke="hsl(25,95%,65%)" strokeWidth="1.5"/>
      <ellipse cx="20" cy="20" rx="12" ry="12" stroke="hsl(25,95%,53%)" strokeWidth="0.8" opacity="0.5"/>
      {/* SOL symbol */}
      <text x="20" y="25" textAnchor="middle" fill="hsl(25,95%,65%)" fontSize="14" fontFamily="Orbitron,sans-serif" fontWeight="700">◎</text>
      {/* Shine */}
      <ellipse cx="14" cy="14" rx="3" ry="1.5" fill="white" opacity="0.15" transform="rotate(-30 14 14)"/>
    </svg>
  ),

  keno: (c) => (
    <svg viewBox="0 0 40 40" fill="none" className={c}>
      {/* 4x4 grid */}
      {Array.from({ length: 16 }, (_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const highlighted = [2, 5, 9, 12, 14].includes(i);
        return (
          <rect key={i}
            x={3 + col * 9}
            y={3 + row * 9}
            width="7.5" height="7.5" rx="1.5"
            fill={highlighted ? "hsl(263,70%,45%)" : "hsl(233,20%,13%)"}
            stroke={highlighted ? "hsl(263,70%,65%)" : "hsl(0,0%,100%,0.07)"}
            strokeWidth="0.7"/>
        );
      })}
      {/* Highlighted numbers */}
      {[2, 5, 9, 14].map(i => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        return (
          <circle key={`dot-${i}`}
            cx={3 + col * 9 + 3.75}
            cy={3 + row * 9 + 3.75}
            r="1.8"
            fill="hsl(263,70%,75%)"/>
        );
      })}
    </svg>
  ),
};

export const GameIcon = ({ id, className = "w-full h-full", size }: GameIconProps) => {
  const style = size ? { width: size, height: size } : undefined;
  const render = icons[id];
  if (!render) return <span className={className} style={style}>🎲</span>;
  return <span className={`inline-flex items-center justify-center ${className}`} style={style}>{render("w-full h-full")}</span>;
};

// For use in lists/tables
export const gameIconMap: Record<string, string> = {
  crash: "crash", blackjack: "blackjack", mines: "mines", slots: "slots",
  roulette: "roulette", plinko: "plinko", dice: "dice", hilo: "hilo",
  towers: "towers", baccarat: "baccarat", coinflip: "coinflip", keno: "keno",
};

export default GameIcon;
