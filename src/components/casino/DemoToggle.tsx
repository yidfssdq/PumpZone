import { useLanguage } from "@/contexts/LanguageContext";
import { useBeta } from "@/contexts/BetaContext";

interface DemoToggleProps {
  isDemo: boolean;
  onToggle: (demo: boolean) => void;
}

const DemoToggle = ({ isDemo, onToggle }: DemoToggleProps) => {
  const { t } = useLanguage();
  const { isBeta } = useBeta();

  // In beta mode, only demo is available
  if (isBeta) {
    return (
      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 border border-border">
        <div className="px-3 py-1 rounded-md text-[11px] font-body font-medium bg-warning/15 text-warning">
          {t("game.demo")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 border border-border">
      <button
        onClick={() => onToggle(false)}
        className={`px-3 py-1 rounded-md text-[11px] font-body font-medium transition-colors ${
          !isDemo ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {t("game.real")}
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`px-3 py-1 rounded-md text-[11px] font-body font-medium transition-colors ${
          isDemo ? "bg-warning/15 text-warning" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {t("game.demo")}
      </button>
    </div>
  );
};

export default DemoToggle;
