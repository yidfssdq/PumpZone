import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2, CheckCircle, Rocket, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

const WaitlistModal = ({ open, onClose }: WaitlistModalProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from("waitlist" as any)
        .insert({ email: email.trim().toLowerCase() } as any);

      if (insertError) {
        if (insertError.message?.includes("duplicate") || insertError.code === "23505") {
          setSuccess(true);
        } else {
          throw new Error(insertError.message);
        }
      } else {
        setSuccess(true);
      }
      localStorage.setItem("pz_waitlist_joined", "true");
    } catch (e: any) {
      setError(e.message || "Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const handleSkip = () => {
    localStorage.setItem("pz_waitlist_seen", "true");
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleSkip()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button onClick={handleSkip} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10">
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground">PumpZone Beta Notice</h2>
                  <p className="text-[10px] font-display text-warning uppercase tracking-wider">Beta version in progress</p>
                </div>
              </div>

              {success ? (
                <div className="text-center space-y-3 py-4">
                  <CheckCircle className="w-10 h-10 text-success mx-auto" />
                  <p className="text-sm font-body text-foreground font-medium">Thanks — we'll notify you by email.</p>
                </div>
              ) : (
                <>
                  {/* Body */}
                  <div className="space-y-3 text-sm font-body text-muted-foreground">
                    <p>
                      PumpZone is currently in <strong className="text-foreground">beta</strong>. During this phase, you can explore the platform and play the games in <strong className="text-foreground">demo mode only</strong>.
                    </p>
                    <p>We are still finalizing the platform before the official launch.</p>
                  </div>

                  {/* Features */}
                  <div className="glass-card p-4 space-y-2.5">
                    {[
                      { icon: "🎯", text: "Fair gameplay, no house edge" },
                      { icon: "💸", text: "0 platform fees" },
                      { icon: "🏆", text: "Better chances to win" },
                    ].map((f) => (
                      <div key={f.text} className="flex items-center gap-2.5 text-sm font-body text-foreground">
                        <span className="text-base">{f.icon}</span>
                        {f.text}
                      </div>
                    ))}
                  </div>

                  {/* CTA text */}
                  <p className="text-sm font-body text-muted-foreground">
                    You can sign up below to be notified when the official version goes live and be among the first to play. 👀
                  </p>
                  <p className="text-xs font-body text-muted-foreground">
                    If you have suggestions, feedback, or questions, feel free to contact us directly on X or Telegram.
                  </p>
                  <p className="text-xs font-body text-muted-foreground">
                    Thanks for supporting PumpZone while we build. 🚀
                  </p>

                  {/* Email input */}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      placeholder="ton@email.com"
                      className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="px-5 py-3 rounded-xl text-sm font-display font-bold tracking-wider bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      NOTIFY ME
                    </button>
                  </div>

                  {error && (
                    <p className="text-xs text-destructive font-body">{error}</p>
                  )}
                </>
              )}

              {/* Skip / Continue */}
              <button
                onClick={handleSkip}
                className="w-full py-3 rounded-xl text-sm font-body text-muted-foreground bg-muted/50 border border-border hover:bg-muted transition-colors"
              >
                Continue in demo mode →
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WaitlistModal;
