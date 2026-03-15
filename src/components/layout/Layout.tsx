import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import BetaBanner from "@/components/BetaBanner";
import WaitlistModal from "@/components/WaitlistModal";
import PolyBackground from "@/components/PolyBackground";
import { useBeta } from "@/contexts/BetaContext";

const FULLSCREEN_GAMES = ["/casino/crash"];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { isBeta } = useBeta();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const location = useLocation();
  const isFullscreen = FULLSCREEN_GAMES.includes(location.pathname);

  useEffect(() => {
    if (isBeta && !localStorage.getItem("pz_waitlist_seen")) setWaitlistOpen(true);
  }, [isBeta]);

  return (
    <>
      {/* Canvas sits at z-index:-1, truly behind all page content */}
      <PolyBackground />

      <div className="min-h-screen flex flex-col relative"
        style={{ overflow: isFullscreen ? "hidden" : undefined }}>
        {isBeta && <BetaBanner onOpenWaitlist={() => setWaitlistOpen(true)} />}
        <Header onOpenWaitlist={() => setWaitlistOpen(true)} />

        {isFullscreen ? (
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        ) : (
          <>
            <main className="container px-4 py-6 pb-safe flex-1">
              {children}
            </main>
            <Footer />
          </>
        )}

        <WaitlistModal
          open={waitlistOpen}
          onClose={() => { setWaitlistOpen(false); localStorage.setItem("pz_waitlist_seen", "true"); }}
        />
      </div>
    </>
  );
};

export default Layout;
