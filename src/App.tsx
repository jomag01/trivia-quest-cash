import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Shop from "./pages/Shop";
import TreasureHunt from "./pages/TreasureHunt";
import Community from "./pages/Community";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import DiamondMarketplace from "./components/DiamondMarketplace";
import NotFound from "./pages/NotFound";
import SellerDashboard from "./pages/SellerDashboard";
import Navigation from "./components/Navigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/game" element={<Game />} />
            <Route path="/game/:category" element={<Game />} />
            <Route path="/treasure-hunt" element={<TreasureHunt />} />
            <Route path="/diamond-marketplace" element={<DiamondMarketplace />} />
            <Route path="/community" element={<Community />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/seller" element={<SellerDashboard />} />
            <Route path="/home" element={<Home />} />
            <Route path="/profile/:userId" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
