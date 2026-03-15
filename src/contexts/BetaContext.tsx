import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface BetaContextType {
  isBeta: boolean;
  setBeta: (val: boolean) => void;
}

const BetaContext = createContext<BetaContextType>({ isBeta: false, setBeta: () => {} });

export const useBeta = () => useContext(BetaContext);

export const BetaProvider = ({ children }: { children: ReactNode }) => {
  const [isBeta, setIsBeta] = useState(() => {
    return localStorage.getItem("pz_beta_mode") === "true";
  });

  const setBeta = (val: boolean) => {
    setIsBeta(val);
    localStorage.setItem("pz_beta_mode", val ? "true" : "false");
  };

  // Listen for changes from other tabs/admin panel
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "pz_beta_mode") {
        setIsBeta(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <BetaContext.Provider value={{ isBeta, setBeta }}>
      {children}
    </BetaContext.Provider>
  );
};
