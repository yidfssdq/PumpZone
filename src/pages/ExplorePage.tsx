import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, TrendingUp, Clock, Flame, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4, ease: [0, 0, 0.2, 1] as const } }),
};

interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  price: number | null;
  dailyVolume?: number | null;
}

const ExplorePage = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"trending" | "price">("trending");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchTokens = () => {
    setLoading(true);
    fetch("https://lite-api.jup.ag/tokens/v1/tagged/birdeye-trending")
      .then((r) => r.json())
      .then((rawTokens) => {
        const top = rawTokens.slice(0, 40);
        const mints = top.map((t: any) => t.address).join(",");
        return fetch(`https://api.jup.ag/price/v3?ids=${mints}`)
          .then((r) => r.json())
          .then((priceData) => {
            setTokens(
              top.map((t: any) => ({
                address: t.address,
                symbol: t.symbol,
                name: t.name,
                logoURI: t.logoURI,
                price: priceData?.data?.[t.address]?.price ? parseFloat(priceData.data[t.address].price) : null,
              }))
            );
          });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTokens();
  }, [refreshKey]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let list = tokens.filter(
      (t) =>
        t.symbol?.toLowerCase().includes(search.toLowerCase()) ||
        t.name?.toLowerCase().includes(search.toLowerCase())
    );
    if (sortBy === "price") list = [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return list;
  }, [tokens, search, sortBy]);

  const formatPrice = (p: number | null) => {
    if (p == null) return "—";
    if (p < 0.0001) return `$${p.toExponential(2)}`;
    if (p < 0.01) return `$${p.toFixed(6)}`;
    if (p < 1) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(2)}`;
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" className="space-y-2">
        <motion.div custom={0} variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-black gradient-text">Explore</h1>
            <p className="text-xs text-muted-foreground font-body mt-1">Tokens trending sur Solana en temps réel</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-body bg-success/10 text-success border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              LIVE
            </span>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-2 rounded-lg bg-surface border border-border hover:bg-muted transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </motion.div>

        {/* Search & Sort */}
        <motion.div custom={1} variants={fadeUp} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un token..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface border border-border text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setSortBy("trending")}
              className={`px-3 py-2 text-xs font-body flex items-center gap-1 transition-colors ${
                sortBy === "trending" ? "bg-primary/10 text-primary" : "bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="w-3 h-3" /> Hot
            </button>
            <button
              onClick={() => setSortBy("price")}
              className={`px-3 py-2 text-xs font-body flex items-center gap-1 transition-colors ${
                sortBy === "price" ? "bg-primary/10 text-primary" : "bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="w-3 h-3" /> Prix
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Token List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-2 w-32 rounded bg-muted" />
              </div>
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground font-body">Aucun token trouvé</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" className="space-y-2">
          {filtered.map((token, i) => (
            <motion.div key={token.address} custom={i} variants={fadeUp}>
              <a
                href={`https://birdeye.so/token/${token.address}?chain=solana`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card p-4 flex items-center gap-3 group hover:border-primary/20 transition-all hover:scale-[1.01] block"
              >
                {/* Rank */}
                <span className="text-xs text-muted-foreground font-display w-6 text-center font-bold">
                  {i + 1}
                </span>

                {/* Logo */}
                {token.logoURI ? (
                  <img src={token.logoURI} alt="" className="w-10 h-10 rounded-full flex-shrink-0 border border-border" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 text-lg">
                    {token.symbol?.[0] || "?"}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-body font-bold truncate">{token.symbol}</span>
                    {i < 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-warning/20 text-warning">
                        🔥 HOT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-body truncate">{token.name}</span>
                    <span className="text-[9px] font-mono text-muted-foreground hidden sm:inline">
                      {shortenAddress(token.address)}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-display font-bold text-success">{formatPrice(token.price)}</p>
                  <p className="text-[10px] text-muted-foreground font-body flex items-center gap-1 justify-end">
                    <Clock className="w-2.5 h-2.5" /> Live
                  </p>
                </div>

                {/* External link icon */}
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </a>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Footer */}
      <div className="glass-card p-4 text-center">
        <p className="text-[10px] text-muted-foreground font-body">
          📊 Données en temps réel via Jupiter · Prix actualisés toutes les 30s · Cliquez sur un token pour voir les détails sur Birdeye
        </p>
      </div>
    </div>
  );
};

export default ExplorePage;
