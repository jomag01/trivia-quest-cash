import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Package, 
  Building2, 
  Car, 
  Hotel, 
  Users, 
  Mail, 
  Phone, 
  Calendar,
  DollarSign,
  Eye,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  TrendingUp,
  Home,
  Tag,
  MapPin
} from "lucide-react";
import { format } from "date-fns";

interface MarketplaceListing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  status: string;
  location: string | null;
  images: string[];
  created_at: string;
  views_count?: number;
}

interface MarketplaceInquiry {
  id: string;
  listing_id: string;
  inquirer_id: string;
  message: string;
  contact_email: string | null;
  contact_phone: string | null;
  preferred_date: string | null;
  status: string;
  seller_response: string | null;
  created_at: string;
  responded_at: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  marketplace_listings?: {
    title: string;
    category: string;
  } | null;
}

interface SellerProduct {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  promo_active: boolean;
  promo_price: number | null;
}

export default function MyListingsHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<MarketplaceInquiry | null>(null);
  const [responseMessage, setResponseMessage] = useState("");

  // Fetch user's marketplace listings
  const { data: listings = [], isLoading: loadingListings } = useQuery({
    queryKey: ["my-marketplace-listings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MarketplaceListing[];
    },
    enabled: !!user
  });

  // Fetch inquiries for user's listings
  const { data: inquiries = [], isLoading: loadingInquiries, refetch: refetchInquiries } = useQuery({
    queryKey: ["my-listing-inquiries", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // First get user's listing IDs
      const { data: listingIds } = await supabase
        .from("marketplace_listings")
        .select("id")
        .eq("seller_id", user.id);
      
      if (!listingIds || listingIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("marketplace_inquiries")
        .select(`
          *,
          marketplace_listings:listing_id(title, category)
        `)
        .in("listing_id", listingIds.map(l => l.id))
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch profiles separately
      const inquirerIds = [...new Set(data?.map(i => i.inquirer_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", inquirerIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return (data || []).map(inquiry => ({
        ...inquiry,
        profiles: profileMap.get(inquiry.inquirer_id) || null
      })) as MarketplaceInquiry[];
    },
    enabled: !!user
  });

  // Fetch seller products (if user is a seller)
  const { data: sellerProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["my-seller-products", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SellerProduct[];
    },
    enabled: !!user
  });

  // Respond to inquiry
  const handleRespondToInquiry = async () => {
    if (!selectedInquiry || !responseMessage.trim()) {
      toast.error("Please enter a response message");
      return;
    }

    const { error } = await supabase
      .from("marketplace_inquiries")
      .update({
        seller_response: responseMessage,
        status: "responded",
        responded_at: new Date().toISOString()
      })
      .eq("id", selectedInquiry.id);

    if (error) {
      toast.error("Failed to send response");
      return;
    }

    toast.success("Response sent successfully!");
    setSelectedInquiry(null);
    setResponseMessage("");
    refetchInquiries();
  };

  // Calculate stats
  const stats = {
    totalListings: listings.length,
    activeListings: listings.filter(l => l.status === "active").length,
    rentals: listings.filter(l => l.category.includes("rent")).length,
    sales: listings.filter(l => l.category.includes("sale")).length,
    totalInquiries: inquiries.length,
    pendingInquiries: inquiries.filter(i => i.status === "pending").length,
    totalProducts: sellerProducts.length,
    activeProducts: sellerProducts.filter(p => p.is_active).length
  };

  // Filter listings
  const filteredListings = listings.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group listings by category
  const rentalListings = filteredListings.filter(l => l.category.includes("rent") || l.category.includes("hotel"));
  const saleListings = filteredListings.filter(l => l.category.includes("sale") || (!l.category.includes("rent") && !l.category.includes("hotel")));

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "vehicles":
      case "cars":
        return <Car className="w-4 h-4" />;
      case "real-estate":
      case "property":
      case "hotels":
        return <Hotel className="w-4 h-4" />;
      case "home":
        return <Home className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
      active: { variant: "default", color: "bg-green-500/20 text-green-600" },
      pending: { variant: "secondary", color: "bg-yellow-500/20 text-yellow-600" },
      rented: { variant: "outline", color: "bg-blue-500/20 text-blue-600" },
      sold: { variant: "outline", color: "bg-purple-500/20 text-purple-600" },
      inactive: { variant: "destructive", color: "bg-red-500/20 text-red-600" },
      responded: { variant: "default", color: "bg-green-500/20 text-green-600" }
    };
    const style = styles[status] || styles.pending;
    return (
      <Badge className={`${style.color} capitalize`}>
        {status}
      </Badge>
    );
  };

  if (!user) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please log in to view your listings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          My Listings Hub
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your products, rentals, and customer inquiries
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalListings}</p>
                <p className="text-xs text-muted-foreground">Total Listings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.activeListings}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalInquiries}</p>
                <p className="text-xs text-muted-foreground">Inquiries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingInquiries}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search listings..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="rentals" className="text-xs">
            Rentals ({stats.rentals})
          </TabsTrigger>
          <TabsTrigger value="sales" className="text-xs">
            Sales ({stats.sales})
          </TabsTrigger>
          <TabsTrigger value="inquiries" className="text-xs">
            Inquiries ({stats.pendingInquiries})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Seller Products Section */}
          {sellerProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  My Shop Products
                </CardTitle>
                <CardDescription>Products listed in the shop</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sellerProducts.slice(0, 6).map(product => (
                    <div key={product.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary">₱{product.base_price}</span>
                          <Badge variant={product.is_active ? "default" : "secondary"} className="text-[10px]">
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Stock: {product.stock_quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {sellerProducts.length > 6 && (
                  <p className="text-sm text-center text-muted-foreground mt-3">
                    +{sellerProducts.length - 6} more products
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Inquiries */}
          {inquiries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  Recent Inquiries
                </CardTitle>
                <CardDescription>Latest messages from interested customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inquiries.slice(0, 5).map(inquiry => (
                    <div 
                      key={inquiry.id} 
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => setSelectedInquiry(inquiry)}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">
                            {inquiry.profiles?.full_name || inquiry.profiles?.email || "Unknown"}
                          </p>
                          {getStatusBadge(inquiry.status)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          Re: {inquiry.marketplace_listings?.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{inquiry.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {listings.length === 0 && sellerProducts.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Listings Yet</h3>
                <p className="text-muted-foreground text-sm">
                  Start listing your products or properties in the Shop or Marketplace
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rentals Tab */}
        <TabsContent value="rentals" className="space-y-4 mt-4">
          {rentalListings.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Home className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No rental listings</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rentalListings.map(listing => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="flex">
                    {listing.images?.[0] ? (
                      <img src={listing.images[0]} alt="" className="w-24 h-24 object-cover" />
                    ) : (
                      <div className="w-24 h-24 bg-muted flex items-center justify-center">
                        {getCategoryIcon(listing.category)}
                      </div>
                    )}
                    <div className="flex-1 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-1">{listing.title}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            {getCategoryIcon(listing.category)}
                            <span className="capitalize">{listing.category}</span>
                          </div>
                        </div>
                        {getStatusBadge(listing.status)}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-primary">
                          ₱{listing.price.toLocaleString()}/mo
                        </span>
                        {listing.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {listing.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Listed {format(new Date(listing.created_at), "MMM d, yyyy")}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      {listing.views_count || 0} views
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4 mt-4">
          {saleListings.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No sale listings</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {saleListings.map(listing => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="flex">
                    {listing.images?.[0] ? (
                      <img src={listing.images[0]} alt="" className="w-24 h-24 object-cover" />
                    ) : (
                      <div className="w-24 h-24 bg-muted flex items-center justify-center">
                        {getCategoryIcon(listing.category)}
                      </div>
                    )}
                    <div className="flex-1 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-1">{listing.title}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            {getCategoryIcon(listing.category)}
                            <span className="capitalize">{listing.category}</span>
                          </div>
                        </div>
                        {getStatusBadge(listing.status)}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-primary">
                          ₱{listing.price.toLocaleString()}
                        </span>
                        {listing.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {listing.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Listed {format(new Date(listing.created_at), "MMM d, yyyy")}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      {listing.views_count || 0} views
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries" className="space-y-4 mt-4">
          {inquiries.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No inquiries yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {inquiries.map(inquiry => (
                <Card 
                  key={inquiry.id} 
                  className={`cursor-pointer transition-colors hover:border-primary/50 ${
                    inquiry.status === "pending" ? "border-amber-500/30" : ""
                  }`}
                  onClick={() => setSelectedInquiry(inquiry)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        {inquiry.profiles?.avatar_url ? (
                          <img src={inquiry.profiles.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <Users className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold truncate">
                            {inquiry.profiles?.full_name || "Unknown User"}
                          </h3>
                          {getStatusBadge(inquiry.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Inquiry for: <span className="text-foreground font-medium">{inquiry.marketplace_listings?.title}</span>
                        </p>
                        <p className="text-sm line-clamp-2 mb-3">{inquiry.message}</p>
                        
                        {/* Contact Info */}
                        <div className="flex flex-wrap gap-3 text-xs">
                          {inquiry.profiles?.email && (
                            <a 
                              href={`mailto:${inquiry.profiles.email}`} 
                              className="flex items-center gap-1 text-primary hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              <Mail className="w-3 h-3" />
                              {inquiry.profiles.email}
                            </a>
                          )}
                          {inquiry.contact_phone && (
                            <a 
                              href={`tel:${inquiry.contact_phone}`} 
                              className="flex items-center gap-1 text-primary hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              <Phone className="w-3 h-3" />
                              {inquiry.contact_phone}
                            </a>
                          )}
                          {inquiry.preferred_date && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(inquiry.preferred_date), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>

                        {/* Response */}
                        {inquiry.seller_response && (
                          <div className="mt-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                            <p className="text-xs font-medium text-green-600 mb-1">Your Response:</p>
                            <p className="text-sm">{inquiry.seller_response}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(inquiry.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      {inquiry.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={e => {
                          e.stopPropagation();
                          setSelectedInquiry(inquiry);
                        }}>
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Respond
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Inquiry Response Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Inquiry Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedInquiry && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{selectedInquiry.profiles?.full_name || "Unknown"}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {selectedInquiry.profiles?.email && (
                      <a href={`mailto:${selectedInquiry.profiles.email}`} className="text-primary hover:underline flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {selectedInquiry.profiles.email}
                      </a>
                    )}
                    {selectedInquiry.contact_phone && (
                      <a href={`tel:${selectedInquiry.contact_phone}`} className="text-primary hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedInquiry.contact_phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Listing Info */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Regarding:</p>
                <p className="font-medium">{selectedInquiry.marketplace_listings?.title}</p>
                <Badge className="mt-1 capitalize">{selectedInquiry.marketplace_listings?.category}</Badge>
              </div>

              {/* Message */}
              <div>
                <p className="text-sm font-medium mb-2">Message:</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{selectedInquiry.message}</p>
              </div>

              {selectedInquiry.preferred_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Preferred Date: {format(new Date(selectedInquiry.preferred_date), "MMMM d, yyyy")}</span>
                </div>
              )}

              {/* Previous Response */}
              {selectedInquiry.seller_response && (
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-xs font-medium text-green-600 mb-1">Your Response:</p>
                  <p className="text-sm">{selectedInquiry.seller_response}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Responded on {selectedInquiry.responded_at && format(new Date(selectedInquiry.responded_at), "MMM d, yyyy")}
                  </p>
                </div>
              )}

              {/* Response Input */}
              {selectedInquiry.status === "pending" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Response:</label>
                  <textarea 
                    className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Type your response to the customer..."
                    value={responseMessage}
                    onChange={e => setResponseMessage(e.target.value)}
                  />
                  <Button className="w-full" onClick={handleRespondToInquiry}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Response
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
