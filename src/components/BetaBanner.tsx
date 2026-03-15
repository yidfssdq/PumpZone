import { useState } from "react";
import { X } from "lucide-react";

interface BetaBannerProps {
  onOpenWaitlist: () => void;
}

const BetaBanner = ({ onOpenWaitlist }: BetaBannerProps) => {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("pz_beta_banner_dismissed") === "true");

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("pz_beta_banner_dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="w-full bg-gradient-to-r from-warning/20 via-warning/10 to-warning/20 border-b border-warning/20">
      <div className="container flex items-center justify-between px-4 py-2 gap-3">
        <p className="text-xs font-body text-warning font-medium flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
          Beta — Join the waitlist
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenWaitlist}
            className="px-3 py-1 rounded-lg text-[10px] font-display font-bold bg-warning text-black hover:bg-warning/90 transition-colors"
          >
            Join Waitlist
          </button>
          <button onClick={handleDismiss} className="text-warning/60 hover:text-warning transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetaBanner;
