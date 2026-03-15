import { useState, useEffect } from "react";
import { Check, Lock, Shield, Rocket } from "lucide-react";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const LIQUIDITY_WALLET = "7Zo2z4MYU25sN2cxnceCKH4wHxA3WD6KZ9N48CwYeUin";

const LaunchPage = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [supply, setSupply] = useState("");
  const [liquidityLock, setLiquidityLock] = useState(true);
  const [antiBot, setAntiBot] = useState(true);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    fetch(`https://api.jup.ag/price/v3?ids=${SOL_MINT}`)
      .then(r => r.json())
      .then(d => {
        const p = d?.data?.[SOL_MINT]?.price;
        if (p) setSolPrice(parseFloat(p));
      })
      .catch(() => {});
  }, []);

  const fee = 0.02;
  const feeUSD = solPrice ? (fee * solPrice).toFixed(2) : "...";

  if (launched) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12">
        <div className="text-6xl animate-pop">🚀</div>
        <h1 className="text-2xl font-display font-bold gradient-text">Token Lancé !</h1>
        <div className="glass-card p-4 space-y-2 text-left">
          <div className="flex justify-between text-sm font-body"><span className="text-muted-foreground">Nom</span><span>{name}</span></div>
          <div className="flex justify-between text-sm font-body"><span className="text-muted-foreground">Ticker</span><span>${ticker}</span></div>
          <div className="flex justify-between text-sm font-body"><span className="text-muted-foreground">Supply</span><span>{parseInt(supply).toLocaleString()}</span></div>
          <div className="flex justify-between text-sm font-body"><span className="text-muted-foreground">Liquidité</span><span className="text-xs text-primary truncate max-w-[180px]">{LIQUIDITY_WALLET}</span></div>
        </div>
        <button onClick={() => { setLaunched(false); setStep(1); setName(""); setTicker(""); setDescription(""); setSupply(""); }} className="px-5 py-2.5 rounded-lg text-sm font-body bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
          Lancer un autre
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-display font-bold gradient-text">Launch Token</h1>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold ${
              step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      <div className="glass-card p-5 space-y-4">
        {step === 1 && (
          <>
            <h2 className="text-sm font-display font-semibold">Identité</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-body">Nom du token</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: PumpCoin" className="w-full mt-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-body text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-body">Ticker</label>
                <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase().slice(0, 8))} placeholder="PUMP" className="w-full mt-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-body text-foreground uppercase focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-body">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre token..." rows={3} className="w-full mt-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-body text-foreground resize-none focus:outline-none focus:border-primary/50" />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-sm font-display font-semibold">Tokenomics</h2>
            <div>
              <label className="text-xs text-muted-foreground font-body">Supply totale</label>
              <input type="number" value={supply} onChange={(e) => setSupply(e.target.value)} placeholder="1000000000" className="w-full mt-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-body text-foreground focus:outline-none focus:border-primary/50" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["1000000", "100000000", "1000000000", "10000000000"].map((v) => (
                <button key={v} onClick={() => setSupply(v)} className={`px-3 py-1.5 rounded-lg text-xs font-body border transition-colors ${supply === v ? "bg-primary/10 text-primary border-primary/30" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>
                  {parseInt(v) >= 1e9 ? `${parseInt(v) / 1e9}B` : parseInt(v) >= 1e6 ? `${parseInt(v) / 1e6}M` : v}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-sm font-display font-semibold">Sécurité & Paiement</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-body">Liquidity Lock 6 mois</span>
                </div>
                <button onClick={() => setLiquidityLock(!liquidityLock)} className={`w-10 h-5 rounded-full transition-colors ${liquidityLock ? "bg-primary" : "bg-muted"}`}>
                  <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${liquidityLock ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-body">Anti-Bot launch</span>
                </div>
                <button onClick={() => setAntiBot(!antiBot)} className={`w-10 h-5 rounded-full transition-colors ${antiBot ? "bg-primary" : "bg-muted"}`}>
                  <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${antiBot ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground font-body">Frais de lancement</p>
                <p className="text-lg font-display font-bold text-primary">{fee} ◎ <span className="text-xs text-muted-foreground font-body">≈ ${feeUSD}</span></p>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-border">
                <p className="text-xs text-muted-foreground font-body">Wallet de liquidité</p>
                <p className="text-xs font-mono text-foreground break-all mt-1">{LIQUIDITY_WALLET}</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/5 border border-warning/10 text-xs text-warning font-body">
                ⚠️ Connectez votre wallet Phantom et votre compte pour lancer.
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="flex-1 py-2.5 rounded-lg text-sm font-body bg-surface border border-border hover:bg-muted transition-colors">
            Retour
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 ? !name || !ticker : !supply}
            className="flex-1 py-2.5 rounded-lg text-sm font-body bg-gradient-to-r from-primary to-secondary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Suivant
          </button>
        ) : (
          <button
            onClick={() => setLaunched(true)}
            className="flex-1 py-2.5 rounded-lg text-sm font-body bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Rocket className="w-4 h-4" /> Lancer le token
          </button>
        )}
      </div>
    </div>
  );
};

export default LaunchPage;
