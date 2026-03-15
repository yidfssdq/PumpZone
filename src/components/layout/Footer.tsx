import { Link } from "react-router-dom";

const LINKS = [
  { label:"Casino",      to:"/casino" },
  { label:"Leaderboard", to:"/leaderboard" },
  { label:"Rewards",     to:"/rewards" },
  { label:"Fairness",    to:"/fairness" },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t mt-16" style={{ borderColor:"hsl(210 15% 10%)", background:"hsl(210 20% 4% / 0.8)" }}>
      <div className="container px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="font-display text-sm font-700 gradient-text tracking-widest">PUMPZONE</span>
            <p className="text-[10px] text-muted-foreground font-body mt-1 max-w-xs">
              Provably fair on-chain casino built on Solana.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map(l => (
              <Link key={l.label} to={l.to}
                className="text-[11px] font-display tracking-wider text-muted-foreground hover:text-primary transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {["𝕏","✈"].map(s => (
              <a key={s} href="#"
                className="w-8 h-8 rounded flex items-center justify-center text-xs text-muted-foreground hover:text-primary transition-all hover:border-primary/30"
                style={{ background:"hsl(210 18% 8%)", border:"1px solid hsl(210 15% 14%)" }}>
                {s}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t text-center" style={{ borderColor:"hsl(210 15% 9%)" }}>
          <p className="text-[10px] text-muted-foreground/30 font-body">© 2025 PumpZone</p>
        </div>
      </div>
    </footer>
  );
}
