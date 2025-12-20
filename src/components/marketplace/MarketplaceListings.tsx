import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Home, Car, Package, Hotel, BedDouble, Building, 
  Plus, Search, Heart, Eye, MapPin, Calendar,
  Phone, Mail, DollarSign, Clock, Star, Filter,
  ChevronLeft, ChevronRight, Lock, AlertCircle,
  Sparkles, Image as ImageIcon, X
} from "lucide-react";

type MarketplaceCategory = 'property_sale' | 'vehicle_sale' | 'secondhand_items' | 'property_rent' | 'room_rent' | 'hotel_staycation';

interface MarketplaceListing {
  id: string;
  seller_id: string;
  category: MarketplaceCategory;
  title: string;
  description: string | null;
  price: number;
  price_type: string;
  currency: string;
  location: string | null;
  city: string | null;
  province: string | null;
  images: string[];
  thumbnail_url: string | null;
  specifications: Record<string, any>;
  amenities: string[];
  condition: string | null;
  status: string;
  views_count: number;
  is_featured: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  fuel_type: string | null;
  transmission: string | null;
  min_stay_nights: number | null;
  max_guests: number | null;
  created_at: string;
  seller_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

const CATEGORIES = [
  { id: 'property_sale', label: 'Properties for Sale', icon: Building, color: 'from-blue-500 to-blue-600' },
  { id: 'vehicle_sale', label: 'Vehicles', icon: Car, color: 'from-red-500 to-red-600' },
  { id: 'secondhand_items', label: 'Second Hand', icon: Package, color: 'from-green-500 to-green-600' },
  { id: 'property_rent', label: 'Property Rental', icon: Home, color: 'from-purple-500 to-purple-600' },
  { id: 'room_rent', label: 'Room Rental', icon: BedDouble, color: 'from-orange-500 to-orange-600' },
  { id: 'hotel_staycation', label: 'Hotel & Staycation', icon: Hotel, color: 'from-pink-500 to-pink-600' },
];

const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'for_parts', label: 'For Parts' },
];

const PRICE_TYPES = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'negotiable', label: 'Negotiable' },
  { value: 'per_night', label: 'Per Night' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_month', label: 'Per Month' },
];

const MarketplaceListings = () => {
  const { user } = useAuth();
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [showInquiryDialog, setShowInquiryDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Create listing form state
  const [newListing, setNewListing] = useState({
    category: 'secondhand_items' as MarketplaceCategory,
    title: '',
    description: '',
    price: '',
    price_type: 'fixed',
    location: '',
    city: '',
    province: '',
    condition: 'good',
    bedrooms: '',
    bathrooms: '',
    area_sqm: '',
    brand: '',
    model: '',
    year: '',
    mileage: '',
    fuel_type: '',
    transmission: '',
    min_stay_nights: '',
    max_guests: '',
    amenities: [] as string[],
    images: [] as string[],
  });

  // Inquiry form state
  const [inquiry, setInquiry] = useState({
    message: '',
    contact_phone: '',
    contact_email: '',
    preferred_date: '',
  });

  useEffect(() => {
    if (user) {
      checkEligibility();
      fetchFavorites();
    } else {
      setCheckingEligibility(false);
    }
    fetchListings();
  }, [user]);

  const checkEligibility = async () => {
    try {
      const { data, error } = await supabase.rpc('check_marketplace_eligibility', {
        user_uuid: user?.id
      });
      if (error) throw error;
      setIsEligible(data);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setIsEligible(false);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const fetchListings = async () => {
    try {
      let query = supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch seller profiles
      const sellerIds = [...new Set((data || []).map(l => l.seller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', sellerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const listingsWithProfiles = (data || []).map(listing => ({
        ...listing,
        images: listing.images || [],
        amenities: listing.amenities || [],
        specifications: listing.specifications || {},
        seller_profile: profileMap.get(listing.seller_id)
      }));

      setListings(listingsWithProfiles as MarketplaceListing[]);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_favorites')
        .select('listing_id')
        .eq('user_id', user?.id);
      if (error) throw error;
      setFavorites(new Set(data?.map(f => f.listing_id) || []));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (listingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      if (favorites.has(listingId)) {
        await supabase
          .from('marketplace_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
        toast.success('Removed from favorites');
      } else {
        await supabase
          .from('marketplace_favorites')
          .insert({ user_id: user.id, listing_id: listingId });
        setFavorites(prev => new Set(prev).add(listingId));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleCreateListing = async () => {
    if (!user || !isEligible) {
      toast.error('You are not eligible to create listings');
      return;
    }

    if (!newListing.title || !newListing.price) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const listingData: any = {
        seller_id: user.id,
        category: newListing.category,
        title: newListing.title,
        description: newListing.description || null,
        price: parseFloat(newListing.price),
        price_type: newListing.price_type,
        location: newListing.location || null,
        city: newListing.city || null,
        province: newListing.province || null,
        condition: newListing.condition || null,
        images: newListing.images,
        thumbnail_url: newListing.images[0] || null,
        amenities: newListing.amenities,
        status: 'active'
      };

      // Add category-specific fields
      if (newListing.category === 'property_sale' || newListing.category === 'property_rent') {
        listingData.bedrooms = newListing.bedrooms ? parseInt(newListing.bedrooms) : null;
        listingData.bathrooms = newListing.bathrooms ? parseInt(newListing.bathrooms) : null;
        listingData.area_sqm = newListing.area_sqm ? parseFloat(newListing.area_sqm) : null;
      }

      if (newListing.category === 'vehicle_sale') {
        listingData.brand = newListing.brand || null;
        listingData.model = newListing.model || null;
        listingData.year = newListing.year ? parseInt(newListing.year) : null;
        listingData.mileage = newListing.mileage ? parseInt(newListing.mileage) : null;
        listingData.fuel_type = newListing.fuel_type || null;
        listingData.transmission = newListing.transmission || null;
      }

      if (newListing.category === 'hotel_staycation' || newListing.category === 'room_rent') {
        listingData.min_stay_nights = newListing.min_stay_nights ? parseInt(newListing.min_stay_nights) : null;
        listingData.max_guests = newListing.max_guests ? parseInt(newListing.max_guests) : null;
        listingData.bedrooms = newListing.bedrooms ? parseInt(newListing.bedrooms) : null;
        listingData.bathrooms = newListing.bathrooms ? parseInt(newListing.bathrooms) : null;
      }

      const { error } = await supabase
        .from('marketplace_listings')
        .insert(listingData);

      if (error) throw error;

      toast.success('Listing created successfully!');
      setShowCreateDialog(false);
      resetNewListing();
      fetchListings();
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast.error(error.message || 'Failed to create listing');
    }
  };

  const handleSendInquiry = async () => {
    if (!user || !selectedListing) {
      toast.error('Please login to send inquiries');
      return;
    }

    if (!inquiry.message) {
      toast.error('Please enter a message');
      return;
    }

    try {
      const { error } = await supabase
        .from('marketplace_inquiries')
        .insert({
          listing_id: selectedListing.id,
          inquirer_id: user.id,
          message: inquiry.message,
          contact_phone: inquiry.contact_phone || null,
          contact_email: inquiry.contact_email || null,
          preferred_date: inquiry.preferred_date || null
        });

      if (error) throw error;

      // Update inquiry count
      await supabase
        .from('marketplace_listings')
        .update({ inquiries_count: (selectedListing.views_count || 0) + 1 })
        .eq('id', selectedListing.id);

      toast.success('Inquiry sent successfully!');
      setShowInquiryDialog(false);
      setInquiry({ message: '', contact_phone: '', contact_email: '', preferred_date: '' });
    } catch (error) {
      console.error('Error sending inquiry:', error);
      toast.error('Failed to send inquiry');
    }
  };

  const resetNewListing = () => {
    setNewListing({
      category: 'secondhand_items',
      title: '',
      description: '',
      price: '',
      price_type: 'fixed',
      location: '',
      city: '',
      province: '',
      condition: 'good',
      bedrooms: '',
      bathrooms: '',
      area_sqm: '',
      brand: '',
      model: '',
      year: '',
      mileage: '',
      fuel_type: '',
      transmission: '',
      min_stay_nights: '',
      max_guests: '',
      amenities: [],
      images: [],
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    for (const file of Array.from(files)) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('marketplace')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('marketplace')
          .getPublicUrl(fileName);

        setNewListing(prev => ({
          ...prev,
          images: [...prev.images, urlData.publicUrl]
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload image');
      }
    }
  };

  const removeImage = (index: number) => {
    setNewListing(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const openListingDetail = async (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setCurrentImageIndex(0);
    setShowDetailDialog(true);

    // Increment view count
    await supabase
      .from('marketplace_listings')
      .update({ views_count: (listing.views_count || 0) + 1 })
      .eq('id', listing.id);
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.city?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatPrice = (price: number, priceType: string, currency: string = 'PHP') => {
    const formatted = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

    if (priceType === 'per_night') return `${formatted}/night`;
    if (priceType === 'per_day') return `${formatted}/day`;
    if (priceType === 'per_month') return `${formatted}/month`;
    if (priceType === 'negotiable') return `${formatted} (Negotiable)`;
    return formatted;
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return cat ? cat.icon : Package;
  };

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return cat ? cat.color : 'from-gray-500 to-gray-600';
  };

  if (checkingEligibility) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Marketplace
          </h2>
          <p className="text-sm text-muted-foreground">Buy, sell & rent properties, vehicles, and more</p>
        </div>
        {user && isEligible && (
          <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-1">
            <Plus className="w-4 h-4" />
            Post Ad
          </Button>
        )}
      </div>

      {/* Eligibility Notice */}
      {user && !isEligible && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200">Seller Access Locked</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                To post listings, you need at least <strong>2 referrals</strong> and <strong>one purchase</strong> (Diamond credits or AI credits package).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!user && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">Login Required</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Login to save favorites and contact sellers. Affiliate members with 2+ referrals and purchases can post ads.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setSelectedCategory('all'); fetchListings(); }}
            className="whitespace-nowrap"
          >
            All
          </Button>
          {CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedCategory(cat.id); fetchListings(); }}
              className="whitespace-nowrap gap-1"
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </Button>
          ))}
        </div>
      </ScrollArea>

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

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-[4/3] bg-muted"></div>
              <CardContent className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-5 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold">No listings found</h3>
          <p className="text-sm text-muted-foreground">Be the first to post in this category!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredListings.map(listing => {
            const CategoryIcon = getCategoryIcon(listing.category);
            return (
              <Card 
                key={listing.id} 
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                onClick={() => openListingDetail(listing)}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  {listing.thumbnail_url || listing.images[0] ? (
                    <img
                      src={listing.thumbnail_url || listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getCategoryColor(listing.category)} flex items-center justify-center`}>
                      <CategoryIcon className="w-12 h-12 text-white/80" />
                    </div>
                  )}
                  
                  {/* Featured Badge */}
                  {listing.is_featured && (
                    <Badge className="absolute top-2 left-2 bg-amber-500 text-white gap-1">
                      <Star className="w-3 h-3" /> Featured
                    </Badge>
                  )}
                  
                  {/* Favorite Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white ${
                      favorites.has(listing.id) ? 'text-red-500' : 'text-gray-500'
                    }`}
                    onClick={(e) => toggleFavorite(listing.id, e)}
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(listing.id) ? 'fill-current' : ''}`} />
                  </Button>

                  {/* Category Badge */}
                  <Badge className={`absolute bottom-2 left-2 bg-gradient-to-r ${getCategoryColor(listing.category)} text-white text-xs`}>
                    <CategoryIcon className="w-3 h-3 mr-1" />
                    {CATEGORIES.find(c => c.id === listing.category)?.label}
                  </Badge>
                </div>

                {/* Content */}
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">{listing.title}</h3>
                  
                  {listing.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{listing.city || listing.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">
                      {formatPrice(listing.price, listing.price_type, listing.currency)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      {listing.views_count || 0}
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {listing.bedrooms && (
                      <Badge variant="secondary" className="text-xs">
                        {listing.bedrooms} BR
                      </Badge>
                    )}
                    {listing.area_sqm && (
                      <Badge variant="secondary" className="text-xs">
                        {listing.area_sqm} sqm
                      </Badge>
                    )}
                    {listing.year && (
                      <Badge variant="secondary" className="text-xs">
                        {listing.year}
                      </Badge>
                    )}
                    {listing.condition && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {listing.condition.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Listing Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Post New Listing
            </DialogTitle>
            <DialogDescription>
              Create a new listing in the marketplace
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category Selection */}
            <div>
              <Label>Category *</Label>
              <Select
                value={newListing.category}
                onValueChange={(value: MarketplaceCategory) => setNewListing(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="w-4 h-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input
                  placeholder="Enter listing title"
                  value={newListing.title}
                  onChange={e => setNewListing(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div>
                <Label>Price *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newListing.price}
                  onChange={e => setNewListing(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>

              <div>
                <Label>Price Type</Label>
                <Select
                  value={newListing.price_type}
                  onValueChange={value => setNewListing(prev => ({ ...prev, price_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your listing..."
                value={newListing.description}
                onChange={e => setNewListing(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  placeholder="City"
                  value={newListing.city}
                  onChange={e => setNewListing(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label>Province</Label>
                <Input
                  placeholder="Province"
                  value={newListing.province}
                  onChange={e => setNewListing(prev => ({ ...prev, province: e.target.value }))}
                />
              </div>
              <div>
                <Label>Detailed Location</Label>
                <Input
                  placeholder="Address/Area"
                  value={newListing.location}
                  onChange={e => setNewListing(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>

            {/* Category-specific fields */}
            {(newListing.category === 'property_sale' || newListing.category === 'property_rent') && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Bedrooms</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newListing.bedrooms}
                    onChange={e => setNewListing(prev => ({ ...prev, bedrooms: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newListing.bathrooms}
                    onChange={e => setNewListing(prev => ({ ...prev, bathrooms: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Area (sqm)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newListing.area_sqm}
                    onChange={e => setNewListing(prev => ({ ...prev, area_sqm: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {newListing.category === 'vehicle_sale' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Brand</Label>
                    <Input
                      placeholder="e.g. Toyota"
                      value={newListing.brand}
                      onChange={e => setNewListing(prev => ({ ...prev, brand: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input
                      placeholder="e.g. Vios"
                      value={newListing.model}
                      onChange={e => setNewListing(prev => ({ ...prev, model: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Input
                      type="number"
                      placeholder="2024"
                      value={newListing.year}
                      onChange={e => setNewListing(prev => ({ ...prev, year: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Mileage (km)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newListing.mileage}
                      onChange={e => setNewListing(prev => ({ ...prev, mileage: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Fuel Type</Label>
                    <Select
                      value={newListing.fuel_type}
                      onValueChange={value => setNewListing(prev => ({ ...prev, fuel_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gasoline">Gasoline</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Transmission</Label>
                    <Select
                      value={newListing.transmission}
                      onValueChange={value => setNewListing(prev => ({ ...prev, transmission: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automatic">Automatic</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="cvt">CVT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {(newListing.category === 'hotel_staycation' || newListing.category === 'room_rent') && (
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Min Stay (nights)</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={newListing.min_stay_nights}
                    onChange={e => setNewListing(prev => ({ ...prev, min_stay_nights: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Max Guests</Label>
                  <Input
                    type="number"
                    placeholder="2"
                    value={newListing.max_guests}
                    onChange={e => setNewListing(prev => ({ ...prev, max_guests: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Bedrooms</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={newListing.bedrooms}
                    onChange={e => setNewListing(prev => ({ ...prev, bedrooms: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={newListing.bathrooms}
                    onChange={e => setNewListing(prev => ({ ...prev, bathrooms: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {newListing.category === 'secondhand_items' && (
              <div>
                <Label>Condition</Label>
                <Select
                  value={newListing.condition}
                  onValueChange={value => setNewListing(prev => ({ ...prev, condition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(cond => (
                      <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Images */}
            <div>
              <Label>Images</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {newListing.images.map((img, index) => (
                  <div key={index} className="relative w-20 h-20">
                    <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upload up to 10 images</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateListing}>Post Listing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Listing Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {selectedListing && (
            <>
              {/* Image Gallery */}
              <div className="relative aspect-video bg-muted">
                {selectedListing.images.length > 0 ? (
                  <>
                    <img
                      src={selectedListing.images[currentImageIndex]}
                      alt={selectedListing.title}
                      className="w-full h-full object-cover"
                    />
                    {selectedListing.images.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => setCurrentImageIndex(prev => 
                            prev === 0 ? selectedListing.images.length - 1 : prev - 1
                          )}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => setCurrentImageIndex(prev => 
                            prev === selectedListing.images.length - 1 ? 0 : prev + 1
                          )}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {selectedListing.images.map((_, i) => (
                            <button
                              key={i}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                              onClick={() => setCurrentImageIndex(i)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getCategoryColor(selectedListing.category)} flex items-center justify-center`}>
                    {(() => { const Icon = getCategoryIcon(selectedListing.category); return <Icon className="w-20 h-20 text-white/80" />; })()}
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className={`bg-gradient-to-r ${getCategoryColor(selectedListing.category)} text-white mb-2`}>
                      {CATEGORIES.find(c => c.id === selectedListing.category)?.label}
                    </Badge>
                    <h2 className="text-xl font-bold">{selectedListing.title}</h2>
                    {selectedListing.location && (
                      <div className="flex items-center gap-1 text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{[selectedListing.location, selectedListing.city, selectedListing.province].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(selectedListing.price, selectedListing.price_type, selectedListing.currency)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Eye className="w-4 h-4" /> {selectedListing.views_count || 0} views
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div className="flex flex-wrap gap-2">
                  {selectedListing.bedrooms && (
                    <Badge variant="outline">{selectedListing.bedrooms} Bedrooms</Badge>
                  )}
                  {selectedListing.bathrooms && (
                    <Badge variant="outline">{selectedListing.bathrooms} Bathrooms</Badge>
                  )}
                  {selectedListing.area_sqm && (
                    <Badge variant="outline">{selectedListing.area_sqm} sqm</Badge>
                  )}
                  {selectedListing.brand && (
                    <Badge variant="outline">{selectedListing.brand}</Badge>
                  )}
                  {selectedListing.model && (
                    <Badge variant="outline">{selectedListing.model}</Badge>
                  )}
                  {selectedListing.year && (
                    <Badge variant="outline">{selectedListing.year}</Badge>
                  )}
                  {selectedListing.mileage && (
                    <Badge variant="outline">{selectedListing.mileage.toLocaleString()} km</Badge>
                  )}
                  {selectedListing.fuel_type && (
                    <Badge variant="outline" className="capitalize">{selectedListing.fuel_type}</Badge>
                  )}
                  {selectedListing.transmission && (
                    <Badge variant="outline" className="capitalize">{selectedListing.transmission}</Badge>
                  )}
                  {selectedListing.condition && (
                    <Badge variant="outline" className="capitalize">{selectedListing.condition.replace('_', ' ')}</Badge>
                  )}
                  {selectedListing.max_guests && (
                    <Badge variant="outline">{selectedListing.max_guests} Guests</Badge>
                  )}
                  {selectedListing.min_stay_nights && (
                    <Badge variant="outline">Min {selectedListing.min_stay_nights} nights</Badge>
                  )}
                </div>

                {/* Description */}
                {selectedListing.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedListing.description}</p>
                  </div>
                )}

                {/* Seller Info */}
                {selectedListing.seller_profile && (
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        {selectedListing.seller_profile.avatar_url ? (
                          <img src={selectedListing.seller_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-primary">
                            {selectedListing.seller_profile.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{selectedListing.seller_profile.username || 'Anonymous'}</p>
                        <p className="text-sm text-muted-foreground">Seller</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant={favorites.has(selectedListing.id) ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={(e) => toggleFavorite(selectedListing.id, e)}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${favorites.has(selectedListing.id) ? 'fill-current' : ''}`} />
                    {favorites.has(selectedListing.id) ? 'Saved' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={() => setShowInquiryDialog(true)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Seller
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Inquiry Dialog */}
      <Dialog open={showInquiryDialog} onOpenChange={setShowInquiryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Seller</DialogTitle>
            <DialogDescription>
              Send a message to the seller about this listing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Message *</Label>
              <Textarea
                placeholder="Hi, I'm interested in this listing..."
                value={inquiry.message}
                onChange={e => setInquiry(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="Your phone number"
                  value={inquiry.contact_phone}
                  onChange={e => setInquiry(prev => ({ ...prev, contact_phone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Your email"
                  value={inquiry.contact_email}
                  onChange={e => setInquiry(prev => ({ ...prev, contact_email: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Preferred Date (optional)</Label>
              <Input
                type="date"
                value={inquiry.preferred_date}
                onChange={e => setInquiry(prev => ({ ...prev, preferred_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInquiryDialog(false)}>Cancel</Button>
            <Button onClick={handleSendInquiry}>Send Inquiry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplaceListings;
