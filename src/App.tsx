import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navigation from "./components/Navigation";
import { parseAndTrackFromUrl } from "@/lib/cookieTracking";

// Lazy load all pages for code splitting
const AIHub = lazy(() => import("./pages/AIHub"));
const Feed = lazy(() => import("./pages/Feed"));
const Games = lazy(() => import("./pages/Games"));
const Home = lazy(() => import("./pages/Home"));
const Game = lazy(() => import("./pages/Game"));
const MobaGame = lazy(() => import("./pages/MobaGame"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Shop = lazy(() => import("./pages/Shop"));
const TreasureHunt = lazy(() => import("./pages/TreasureHunt"));
const Community = lazy(() => import("./pages/Community"));
const Profile = lazy(() => import("./pages/Profile"));
const DiamondMarketplace = lazy(() => import("./components/DiamondMarketplace"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const Booking = lazy(() => import("./pages/Booking"));
const Food = lazy(() => import("./pages/Food"));
const Chess = lazy(() => import("./pages/Chess"));
const Notifications = lazy(() => import("./components/notifications/NotificationsPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
// Configure QueryClient with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

// Cookie tracking component
const CookieTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Track referral links on route changes
    parseAndTrackFromUrl();
  }, [location.search]);
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CookieTracker />
          <Navigation />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<AIHub />} />
              <Route path="/ai-hub" element={<AIHub />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/games" element={<Games />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/game" element={<Game />} />
              <Route path="/game/:category" element={<Game />} />
              <Route path="/moba-game" element={<MobaGame />} />
              <Route path="/treasure-hunt" element={<TreasureHunt />} />
              <Route path="/diamond-marketplace" element={<DiamondMarketplace />} />
              <Route path="/community" element={<Community />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/food" element={<Food />} />
              <Route path="/chess" element={<Chess />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/seller" element={<SellerDashboard />} />
              <Route path="/home" element={<Home />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;