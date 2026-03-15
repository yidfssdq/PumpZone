import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { BetaProvider } from "@/contexts/BetaContext";
import AuthModal from "@/components/auth/AuthModal";
import Layout from "@/components/layout/Layout";
import { lazy, Suspense } from "react";

const HomePage = lazy(() => import("@/pages/HomePage"));
const CasinoPage = lazy(() => import("@/pages/CasinoPage"));
const BlackjackPage = lazy(() => import("@/pages/casino/BlackjackPage"));
const MinesPage = lazy(() => import("@/pages/casino/MinesPage"));
const SlotsPage = lazy(() => import("@/pages/casino/SlotsPage"));
const RoulettePage = lazy(() => import("@/pages/casino/RoulettePage"));
const CrashPage = lazy(() => import("@/pages/casino/CrashPage"));
const PlinkoPage = lazy(() => import("@/pages/casino/PlinkoPage"));
const DicePage = lazy(() => import("@/pages/casino/DicePage"));
const HiLoPage = lazy(() => import("@/pages/casino/HiLoPage"));
const TowersPage = lazy(() => import("@/pages/casino/TowersPage"));
const CoinflipPage = lazy(() => import("@/pages/casino/CoinflipPage"));
const KenoPage = lazy(() => import("@/pages/casino/KenoPage"));
const BaccaratPage = lazy(() => import("@/pages/casino/BaccaratPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const RewardsPage = lazy(() => import("@/pages/RewardsPage"));
const FairnessPage = lazy(() => import("@/pages/FairnessPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
        <BetaProvider>
        <AuthProvider>
          <AuthModal />
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/ref/:username" element={<HomePage />} />
                <Route path="/casino" element={<CasinoPage />} />
                <Route path="/casino/blackjack" element={<BlackjackPage />} />
                <Route path="/casino/mines" element={<MinesPage />} />
                <Route path="/casino/slots" element={<SlotsPage />} />
                <Route path="/casino/roulette" element={<RoulettePage />} />
                <Route path="/casino/crash" element={<CrashPage />} />
                <Route path="/casino/plinko" element={<PlinkoPage />} />
                <Route path="/casino/dice" element={<DicePage />} />
                <Route path="/casino/hilo" element={<HiLoPage />} />
                <Route path="/casino/towers" element={<TowersPage />} />
                <Route path="/casino/coinflip" element={<CoinflipPage />} />
                <Route path="/casino/keno" element={<KenoPage />} />
                <Route path="/casino/baccarat" element={<BaccaratPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/fairness" element={<FairnessPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </AuthProvider>
        </BetaProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
