import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, Mail } from "lucide-react";

const AuthModal = () => {
  const { showAuthModal, setShowAuthModal, signUp, signIn } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [showEmailSent, setShowEmailSent] = useState(false);

  const reset = useCallback(() => {
    setEmail(""); setUsername(""); setPassword(""); setConfirmPassword("");
    setError(""); setSuccess(""); setShowEmailSent(false);
  }, []);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);

    try {
      if (tab === "register") {
        if (password !== confirmPassword) { setError(t("auth.passwordMismatch")); setSubmitting(false); return; }
        if (username.length < 3 || username.length > 20) { setError(t("auth.usernameLength")); setSubmitting(false); return; }
        if (password.length < 6) { setError(t("auth.passwordLength")); setSubmitting(false); return; }

        const result = await signUp(email, password, username);
        if (result.error) {
          setError(result.error);
        } else {
          setShowEmailSent(true);
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          setShowAuthModal(false);
          reset();
        }
      }
    } catch {
      setError(t("auth.error"));
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => { setShowAuthModal(false); reset(); }}>
      <div className="glass-card w-full max-w-sm mx-4 p-6 animate-pop" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg gradient-text">
            {showEmailSent ? t("auth.verification") : tab === "login" ? t("auth.login") : t("auth.register")}
          </h2>
          <button onClick={() => { setShowAuthModal(false); reset(); }} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {showEmailSent ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <Mail className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm font-body text-foreground font-medium">
              {t("auth.checkEmail")}
            </p>
            <p className="text-xs text-muted-foreground font-body">
              {t("auth.clickLink")} <span className="text-foreground font-medium">{email}</span>
            </p>
            <p className="text-xs text-muted-foreground font-body">
              {t("auth.checkSpam")}
            </p>
            <button onClick={() => { setShowAuthModal(false); reset(); }}
              className="w-full py-3 rounded-lg text-sm font-body font-medium bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-opacity">
              {t("auth.understood")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-5">
              <button onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 rounded-lg text-xs font-body font-medium transition-colors ${tab === "login" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-surface"}`}>
                {t("auth.loginTab")}
              </button>
              <button onClick={() => { setTab("register"); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 rounded-lg text-xs font-body font-medium transition-colors ${tab === "register" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-surface"}`}>
                {t("auth.registerTab")}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("auth.email")} required
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />

              {tab === "register" && (
                <input type="text" value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))} placeholder={t("auth.username")} required
                  className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              )}

              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("auth.password")} required
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />

              {tab === "register" && (
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("auth.confirmPassword")} required
                  className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              )}

              {error && <p className="text-xs text-destructive font-body">{error}</p>}
              {success && <p className="text-xs text-success font-body">{success}</p>}

              {tab === "register" && (
                <div className="glass-card p-3 text-center">
                  <span className="text-xs font-body">{t("auth.freeWallet")}</span>
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-lg text-sm font-body font-medium bg-gradient-to-r from-primary to-secondary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity">
                {submitting ? "..." : tab === "login" ? t("auth.signInBtn") : t("auth.createBtn")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
