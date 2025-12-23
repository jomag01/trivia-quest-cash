import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  DollarSign, 
  CreditCard, 
  CheckCircle, 
  XCircle,
  Clock,
  Shield,
  Eye,
  Menu,
  X,
  Gem,
  Users,
  LogOut
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryManagement } from "@/components/CategoryManagement";
import { PrizeManagement } from "@/components/PrizeManagement";
import { ProductManagement } from "@/components/ProductManagement";
import { ProductCategoryManagement } from "@/components/ProductCategoryManagement";
import { OrderManagement } from "@/components/OrderManagement";
import { ImageMigrationTool } from "@/components/ImageMigrationTool";
import StairStepManagement from "@/components/StairStepManagement";
import { TreasureHuntManagement } from "@/components/TreasureHuntManagement";
import TreasureAdminSettings from "@/components/TreasureAdminSettings";
import UnilevelCommissionSettings from "@/components/UnilevelCommissionSettings";
import { UplineTransferManagement } from "@/components/UplineTransferManagement";
import { ShippingZoneManagement } from "@/components/ShippingZoneManagement";
import { BulkShippingManagement } from "@/components/BulkShippingManagement";
import CourierSettingsManagement from "@/components/CourierSettingsManagement";
import SellerVerificationManagement from "@/components/SellerVerificationManagement";
import MultivendorProductManagement from "@/components/MultivendorProductManagement";
import { SalesAnalytics } from "@/components/SalesAnalytics";
import { AdManagement } from "@/components/AdManagement";
import { UserAdManagement } from "@/components/UserAdManagement";
import ServiceCommissionManagement from "@/components/ServiceCommissionManagement";
import ServiceCategoryManagement from "@/components/ServiceCategoryManagement";
import ServiceProviderVerificationManagement from "@/components/ServiceProviderVerificationManagement";
import BookingServiceManagement from "@/components/booking/BookingServiceManagement";
import { HomePageManagement } from "@/components/HomePageManagement";
import { FoodCommissionManagement } from "@/components/FoodCommissionManagement";
import { FoodItemRewardsManagement } from "@/components/food/FoodItemRewardsManagement";
import { RiderManagement } from "@/components/food/RiderManagement";
import { Gamepad2, Trophy, ShoppingBag, FolderOpen, Package, Upload, TrendingUp, MapPin, Truck, CalendarCheck, Tags, Home, UtensilsCrossed, Bike, Cookie, Calculator, Barcode, Image, RotateCcw, Sparkles, GitBranch, Building2, Percent } from "lucide-react";
import { POSSystem } from "@/components/admin/POSSystem";
import { CookiePolicyManagement } from "@/components/CookiePolicyManagement";
import AdminAccountingDashboard from "@/components/AdminAccountingDashboard";
import AppLogoManagement from "@/components/admin/AppLogoManagement";
import SystemResetManagement from "@/components/admin/SystemResetManagement";
import AISettingsManagement from "@/components/admin/AISettingsManagement";
import AIProviderPricing from "@/components/admin/AIProviderPricing";
import BinarySystemManagement from "@/components/admin/BinarySystemManagement";
import QRPaymentSettings from "@/components/admin/QRPaymentSettings";
import BinaryAIPurchaseManagement from "@/components/admin/BinaryAIPurchaseManagement";
import MarketplaceCategoryManagement from "@/components/admin/MarketplaceCategoryManagement";
import SupplierManagement from "@/components/admin/SupplierManagement";
import RetailerCommissionSettings from "@/components/admin/RetailerCommissionSettings";
import { cn } from "@/lib/utils";

interface CreditPurchase {
  id: string;
  user_id: string;
  amount: number;
  credits: number;
  payment_method: string;
  proof_image_url: string | null;
  reference_number: string | null;
  sender_name: string | null;
  referral_code: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  payout_method: string;
  account_name: string;
  account_number: string;
  bank_name: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading, signOut } = useAuth();
  const [creditPurchases, setCreditPurchases] = useState<CreditPurchase[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [activeTab, setActiveTab] = useState("sales-analytics");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: "sales-analytics", label: "Sales Analytics", icon: TrendingUp },
    { id: "accounting", label: "Accounting & Payouts", icon: Calculator },
    { id: "homepage", label: "Homepage Settings", icon: Home },
    { id: "app-logo", label: "App Logo", icon: Image },
    { id: "credits", label: "Credit Purchases", icon: CreditCard },
    { id: "ai-packages", label: "AI Package Purchases", icon: Sparkles },
    { id: "payouts", label: "Payout Requests", icon: DollarSign },
    { id: "categories", label: "Game Categories", icon: Gamepad2 },
    { id: "treasure-hunt", label: "Treasure Hunt", icon: MapPin },
    { id: "diamond-settings", label: "Diamond Settings", icon: Gem },
    { id: "unilevel-settings", label: "Unilevel Network", icon: Users },
    { id: "prizes", label: "Prize Config", icon: Trophy },
    { id: "product-categories", label: "Product Categories", icon: FolderOpen },
    { id: "marketplace-categories", label: "Marketplace Categories", icon: FolderOpen },
    { id: "products", label: "Products", icon: ShoppingBag },
    { id: "orders", label: "Orders", icon: Package },
    { id: "shipping-zones", label: "Shipping Zones", icon: MapPin },
    { id: "bulk-shipping", label: "Bulk Shipping", icon: Truck },
    { id: "courier-settings", label: "Courier Settings", icon: Truck },
    { id: "ad-management", label: "Ad Management", icon: Upload },
    { id: "user-ads", label: "User Ad Campaigns", icon: TrendingUp },
    { id: "migration", label: "Image Migration", icon: Upload },
    { id: "stair-step", label: "Stair Step MLM", icon: TrendingUp },
    { id: "transfers", label: "Upline Transfers", icon: Users },
    { id: "seller-verification", label: "Seller Verification", icon: CheckCircle },
    { id: "multivendor-products", label: "User Products", icon: Package },
    { id: "service-categories", label: "Service Categories", icon: Tags },
    { id: "booking-services", label: "Booking Services", icon: CalendarCheck },
    { id: "service-commissions", label: "Service Commissions", icon: DollarSign },
    { id: "provider-verification", label: "Provider Verification", icon: Shield },
    { id: "food-vendors", label: "Food Vendors", icon: UtensilsCrossed },
    { id: "food-item-rewards", label: "Food Item Rewards", icon: Gem },
    { id: "rider-management", label: "Rider Management", icon: Bike },
    { id: "cookie-policy", label: "Cookie Policy", icon: Cookie },
    { id: "pos-system", label: "POS & Inventory", icon: Barcode },
    { id: "ai-settings", label: "AI Hub Settings", icon: Sparkles },
    { id: "ai-pricing", label: "AI Provider Costs", icon: DollarSign },
    { id: "qr-payment", label: "QR Payment Settings", icon: CreditCard },
    { id: "binary-system", label: "Binary MLM System", icon: GitBranch },
    { id: "suppliers", label: "Supplier Management", icon: Building2 },
    { id: "retailer-commissions", label: "Retailer Commissions", icon: Percent },
    { id: "system-reset", label: "System Reset", icon: RotateCcw },
  ];

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin only.");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchCreditPurchases();
      fetchPayoutRequests();
    }
  }, [isAdmin]);

  const fetchCreditPurchases = async () => {
    const { data, error} = await supabase
      .from("credit_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load credit purchases");
      return;
    }

    setCreditPurchases(data || []);
  };

  const fetchPayoutRequests = async () => {
    const { data, error } = await supabase
      .from("payout_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load payout requests");
      return;
    }

    setPayoutRequests(data || []);
  };

  const handleApproveCreditPurchase = async (id: string) => {
    const purchase = creditPurchases.find(p => p.id === id);
    if (!purchase) return;

    const { error: updateError } = await supabase
      .from("credit_purchases")
      .update({
        status: "approved",
        admin_notes: adminNotes,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      toast.error("Failed to approve purchase");
      return;
    }

    // Add credits to user wallet
    const { error: walletError } = await supabase.rpc("increment_credits", {
      user_id: purchase.user_id,
      amount: purchase.credits,
    });

    if (walletError) {
      toast.error("Failed to add credits to wallet");
      return;
    }

    toast.success("Credit purchase approved!");
    setAdminNotes("");
    setProcessingId(null);
    fetchCreditPurchases();
  };

  const handleRejectCreditPurchase = async (id: string) => {
    const { error } = await supabase
      .from("credit_purchases")
      .update({
        status: "rejected",
        admin_notes: adminNotes,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to reject purchase");
      return;
    }

    toast.success("Credit purchase rejected");
    setAdminNotes("");
    setProcessingId(null);
    fetchCreditPurchases();
  };

  const handleApprovePayoutRequest = async (id: string) => {
    try {
      // Get the payout request details
      const payoutRequest = payoutRequests.find(p => p.id === id);
      if (!payoutRequest) {
        toast.error("Payout request not found");
        return;
      }

      // Get diamond price to calculate diamonds to deduct
      const { data: settingsData } = await supabase
        .from("treasure_admin_settings")
        .select("setting_value")
        .eq("setting_key", "base_diamond_price")
        .maybeSingle();

      const diamondPrice = settingsData?.setting_value ? parseFloat(settingsData.setting_value) : 10;
      const diamondsToDeduct = Math.ceil(payoutRequest.amount / diamondPrice);

      // Get user's current diamond balance
      const { data: walletData, error: walletFetchError } = await supabase
        .from("treasure_wallet")
        .select("diamonds")
        .eq("user_id", payoutRequest.user_id)
        .maybeSingle();

      if (walletFetchError) {
        toast.error("Failed to fetch user wallet");
        return;
      }

      const currentDiamonds = walletData?.diamonds || 0;

      if (currentDiamonds < diamondsToDeduct) {
        toast.error(`Insufficient diamonds. User has ${currentDiamonds} but needs ${diamondsToDeduct}`);
        return;
      }

      // Deduct diamonds from treasure_wallet
      const { error: deductError } = await supabase
        .from("treasure_wallet")
        .update({ 
          diamonds: currentDiamonds - diamondsToDeduct,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", payoutRequest.user_id);

      if (deductError) {
        toast.error("Failed to deduct diamonds from user wallet");
        return;
      }

      // Update payout request status
      const { error } = await supabase
        .from("payout_requests")
        .update({
          status: "approved",
          admin_notes: adminNotes,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        // Rollback diamond deduction if status update fails
        await supabase
          .from("treasure_wallet")
          .update({ diamonds: currentDiamonds })
          .eq("user_id", payoutRequest.user_id);
        
        toast.error("Failed to approve payout");
        return;
      }

      // Send notification to user about approved payout
      await supabase
        .from("notifications")
        .insert({
          user_id: payoutRequest.user_id,
          type: "payout",
          title: "Payout Approved! 💰",
          message: `Your payout request of ₱${payoutRequest.amount.toLocaleString()} has been approved. ${diamondsToDeduct} diamonds have been deducted from your balance. Processing may take 1-3 business days.`,
          reference_id: id,
        });

      toast.success(`Payout approved! ${diamondsToDeduct} diamonds deducted from user.`);
      setAdminNotes("");
      setProcessingId(null);
      fetchPayoutRequests();
    } catch (error) {
      console.error("Error approving payout:", error);
      toast.error("An error occurred while approving payout");
    }
  };

  const handleRejectPayoutRequest = async (id: string) => {
    const { error } = await supabase
      .from("payout_requests")
      .update({
        status: "rejected",
        admin_notes: adminNotes,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to reject payout");
      return;
    }

    toast.success("Payout request rejected");
    setAdminNotes("");
    setProcessingId(null);
    fetchPayoutRequests();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      completed: { variant: "default", icon: CheckCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="font-bold text-lg">Admin</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1",
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="p-2 border-t">
            <button
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Shield className="w-6 h-6 text-primary hidden lg:block" />
            <h1 className="text-2xl font-bold text-gradient-gold flex-1">
              {menuItems.find(item => item.id === activeTab)?.label || "Admin Panel"}
            </h1>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive hidden lg:flex"
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 md:p-6">
          {activeTab === "credits" && (
            <div className="space-y-4">
              {creditPurchases.map((purchase) => (
                <Card key={purchase.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">
                          User ID: {purchase.user_id.slice(0, 8)}...
                        </h3>
                        {getStatusBadge(purchase.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><strong>Amount:</strong> ₱{purchase.amount.toFixed(2)}</p>
                        <p><strong>Credits:</strong> {purchase.credits}</p>
                        <p><strong>Method:</strong> {purchase.payment_method}</p>
                        <p><strong>Date:</strong> {new Date(purchase.created_at).toLocaleDateString()}</p>
                        <p><strong>Reference:</strong> {purchase.reference_number || "N/A"}</p>
                        <p><strong>Sender:</strong> {purchase.sender_name || "N/A"}</p>
                        {purchase.referral_code && (
                          <p className="col-span-2"><strong>Referral Code:</strong> {purchase.referral_code}</p>
                        )}
                      </div>
                      {purchase.admin_notes && (
                        <div className="mt-2 p-2 bg-muted rounded">
                          <p className="text-xs font-semibold">Admin Notes:</p>
                          <p className="text-sm">{purchase.admin_notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {purchase.proof_image_url && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedProof(purchase.proof_image_url)}
                          variant="outline"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Proof
                        </Button>
                      )}
                      {purchase.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => setProcessingId(purchase.id)}
                          variant="default"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Process
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {creditPurchases.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No credit purchases yet</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === "payouts" && (
            <div className="space-y-4">
              {payoutRequests.map((payout) => (
                <Card key={payout.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">
                          User ID: {payout.user_id.slice(0, 8)}...
                        </h3>
                        {getStatusBadge(payout.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><strong>Amount:</strong> ₱{payout.amount.toFixed(2)}</p>
                        <p><strong>Method:</strong> {payout.payout_method}</p>
                        <p><strong>Account Name:</strong> {payout.account_name}</p>
                        <p><strong>Account Number:</strong> {payout.account_number}</p>
                        {payout.bank_name && <p><strong>Bank:</strong> {payout.bank_name}</p>}
                        <p><strong>Date:</strong> {new Date(payout.created_at).toLocaleDateString()}</p>
                      </div>
                      {payout.admin_notes && (
                        <div className="mt-2 p-2 bg-muted rounded">
                          <p className="text-xs font-semibold">Admin Notes:</p>
                          <p className="text-sm">{payout.admin_notes}</p>
                        </div>
                      )}
                    </div>
                    {payout.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => setProcessingId(payout.id)}
                        variant="default"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Process
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              {payoutRequests.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No payout requests yet</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === "sales-analytics" && <SalesAnalytics />}
          {activeTab === "accounting" && <AdminAccountingDashboard />}
          {activeTab === "homepage" && <HomePageManagement />}
          {activeTab === "app-logo" && <AppLogoManagement />}
          {activeTab === "ad-management" && <AdManagement />}
          {activeTab === "user-ads" && <UserAdManagement />}
          {activeTab === "categories" && <CategoryManagement />}
          {activeTab === "treasure-hunt" && <TreasureHuntManagement />}
          {activeTab === "diamond-settings" && <TreasureAdminSettings />}
          {activeTab === "prizes" && <PrizeManagement />}
          {activeTab === "product-categories" && <ProductCategoryManagement />}
          {activeTab === "products" && <ProductManagement />}
          {activeTab === "orders" && <OrderManagement />}
          {activeTab === "shipping-zones" && <ShippingZoneManagement />}
          {activeTab === "bulk-shipping" && <BulkShippingManagement />}
          {activeTab === "courier-settings" && <CourierSettingsManagement />}
          {activeTab === "migration" && <ImageMigrationTool />}
          {activeTab === "stair-step" && <StairStepManagement />}
          {activeTab === "transfers" && <UplineTransferManagement />}
          {activeTab === "seller-verification" && <SellerVerificationManagement />}
          {activeTab === "multivendor-products" && <MultivendorProductManagement />}
          {activeTab === "service-categories" && <ServiceCategoryManagement />}
          {activeTab === "booking-services" && <BookingServiceManagement />}
          {activeTab === "service-commissions" && <ServiceCommissionManagement />}
          {activeTab === "provider-verification" && <ServiceProviderVerificationManagement />}
          {activeTab === "food-vendors" && <FoodCommissionManagement />}
          {activeTab === "food-item-rewards" && <FoodItemRewardsManagement />}
          {activeTab === "rider-management" && <RiderManagement />}
          {activeTab === "cookie-policy" && <CookiePolicyManagement />}
          {activeTab === "pos-system" && <POSSystem />}
          {activeTab === "unilevel-settings" && <UnilevelCommissionSettings />}
          {activeTab === "ai-settings" && <AISettingsManagement />}
          {activeTab === "ai-pricing" && <AIProviderPricing />}
          {activeTab === "qr-payment" && <QRPaymentSettings />}
          {activeTab === "binary-system" && <BinarySystemManagement />}
          {activeTab === "ai-packages" && <BinaryAIPurchaseManagement />}
          {activeTab === "marketplace-categories" && <MarketplaceCategoryManagement />}
          {activeTab === "suppliers" && <SupplierManagement />}
          {activeTab === "retailer-commissions" && <RetailerCommissionSettings />}
          {activeTab === "system-reset" && <SystemResetManagement />}
        </main>
      </div>

      {/* Processing Dialog */}
      <Dialog open={!!processingId} onOpenChange={() => { setProcessingId(null); setAdminNotes(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Admin Notes (optional)</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this transaction..."
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => {
                  const isCreditPurchase = creditPurchases.some(p => p.id === processingId);
                  if (isCreditPurchase) {
                    handleApproveCreditPurchase(processingId!);
                  } else {
                    handleApprovePayoutRequest(processingId!);
                  }
                }}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => {
                  const isCreditPurchase = creditPurchases.some(p => p.id === processingId);
                  if (isCreditPurchase) {
                    handleRejectCreditPurchase(processingId!);
                  } else {
                    handleRejectPayoutRequest(processingId!);
                  }
                }}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Proof Image Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <div className="w-full overflow-auto">
              <img 
                src={selectedProof} 
                alt="Payment proof" 
                className="w-full h-auto rounded-lg object-contain max-h-[70vh]"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;