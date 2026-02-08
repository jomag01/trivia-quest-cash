import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search, Heart, MapPin, Star, BedDouble, Bath, Users,
  Home, Hotel, Building, ChevronLeft, ChevronRight,
  Share2, Grid, Wifi, Car, UtensilsCrossed, Waves,
  Wind, Tv, Shield, Calendar, ArrowUpDown, X, Navigation
} from "lucide-react";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";
import BookServiceDialog from "./BookServiceDialog";

type RentalCategory = 'Hotel & Staycation' | 'Room Rental' | 'Property Rental';

interface RentalListing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  price_type: string | null;
  image_url: string | null;
  gallery_images: string[] | null;
  provider_id: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  amenities: string[] | null;
  min_stay_nights: number | null;
  max_guests_rental: number | null;
  location_address: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  diamond_reward: number;
  duration_minutes: number;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
  distance?: number | null;
}

const RENTAL_CATEGORIES: { id: RentalCategory; label: string; icon: typeof Hotel }[] = [
  { id: 'Hotel & Staycation', label: 'Hotels & Stays', icon: Hotel },
  { id: 'Room Rental', label: 'Rooms', icon: BedDouble },
  { id: 'Property Rental', label: 'Properties', icon: Home },
];

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  'WiFi': Wifi,
  'Parking': Car,
  'Kitchen': UtensilsCrossed,
  'Pool': Waves,
  'AC': Wind,
  'TV': Tv,
};

const RentalListings = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'nearby'>('newest');
  const [selectedListing, setSelectedListing] = useState<RentalListing | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { latitude, longitude } = useGeolocation();

  useEffect(() => {
    fetchListings();
  }, [selectedCategory]);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  const fetchListings = async () => {
    setLoading(true);
    const rentalCategories = ['Hotel & Staycation', 'Room Rental', 'Property Rental'];
    
    let query = supabase
      .from('services')
      .select(`*, profiles!services_provider_id_fkey (full_name, avatar_url)`)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .in('category', rentalCategories);

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) {
      setListings(data as RentalListing[]);
    }
    setLoading(false);
  };

  const fetchFavorites = async () => {
    if (!user) return;
    // Using service_bookings as a proxy for favorites - or we can skip
    // For now just maintain local state
  };

  const filteredListings = useMemo(() => {
    let result = listings.filter(l =>
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.province?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.location_address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Add distance
    result = result.map(l => ({
      ...l,
      distance: latitude && longitude && l.latitude && l.longitude
        ? calculateDistance(latitude, longitude, l.latitude, l.longitude)
        : null
    }));

    // Sort
    switch (sortBy) {
      case 'price_low': result.sort((a, b) => a.price - b.price); break;
      case 'price_high': result.sort((a, b) => b.price - a.price); break;
      case 'nearby': result.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999)); break;
      default: break; // newest is already sorted by query
    }

    return result;
  }, [listings, searchQuery, sortBy, latitude, longitude]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatPrice = (price: number, priceType: string | null) => {
    const formatted = `₱${price.toLocaleString()}`;
    if (priceType === 'per_night') return `${formatted} / night`;
    if (priceType === 'per_month') return `${formatted} / month`;
    if (priceType === 'per_day') return `${formatted} / day`;
    return formatted;
  };

  const openDetail = (listing: RentalListing) => {
    setSelectedListing(listing);
    setCurrentImageIndex(0);
    setShowDetail(true);
  };

  const handleBook = (listing: RentalListing) => {
    setSelectedListing(listing);
    setShowBookDialog(true);
    setShowDetail(false);
  };

  const getImages = (listing: RentalListing) => {
    const imgs: string[] = [];
    if (listing.image_url) imgs.push(listing.image_url);
    if (listing.gallery_images) imgs.push(...listing.gallery_images);
    return imgs.length > 0 ? imgs : [];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Category Pills - Airbnb style */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex flex-col items-center gap-1 px-4 py-2 border-b-2 transition-all min-w-[64px] ${
              selectedCategory === 'all'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <Grid className="h-5 w-5" />
            <span className="text-xs font-medium">All</span>
          </button>
          {RENTAL_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 border-b-2 transition-all min-w-[64px] ${
                selectedCategory === cat.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              <cat.icon className="h-5 w-5" />
              <span className="text-xs font-medium whitespace-nowrap">{cat.label}</span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Search & Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by location, name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 rounded-full border-muted-foreground/20"
          />
        </div>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-[130px] rounded-full">
            <ArrowUpDown className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_low">Price ↑</SelectItem>
            <SelectItem value="price_high">Price ↓</SelectItem>
            <SelectItem value="nearby" disabled={!latitude}>Nearby</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Listings Grid - Airbnb style */}
      {filteredListings.length === 0 ? (
        <div className="text-center py-16">
          <Hotel className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg">No rentals found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your filters or search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredListings.map(listing => {
            const images = getImages(listing);
            return (
              <div
                key={listing.id}
                className="group cursor-pointer"
                onClick={() => openDetail(listing)}
              >
                {/* Image Carousel */}
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-3">
                  {images.length > 0 ? (
                    <img
                      src={images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                      <Hotel className="h-16 w-16 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Favorite */}
                  <button
                    className="absolute top-3 right-3 p-1.5"
                    onClick={e => toggleFavorite(listing.id, e)}
                  >
                    <Heart
                      className={`h-6 w-6 drop-shadow-md transition-colors ${
                        favorites.has(listing.id)
                          ? 'fill-red-500 text-red-500'
                          : 'fill-black/30 text-white'
                      }`}
                    />
                  </button>

                  {/* Diamond reward */}
                  {listing.diamond_reward > 0 && (
                    <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground text-xs">
                      💎 +{listing.diamond_reward}
                    </Badge>
                  )}

                  {/* Image count */}
                  {images.length > 1 && (
                    <Badge variant="secondary" className="absolute bottom-3 right-3 text-xs bg-black/50 text-white border-0">
                      1/{images.length}
                    </Badge>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm line-clamp-1">{listing.title}</h3>
                    {listing.distance != null && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {listing.distance < 1
                          ? `${Math.round(listing.distance * 1000)}m`
                          : `${listing.distance.toFixed(1)}km`}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {listing.city || listing.province || listing.location_address || 'Location not set'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {listing.bedrooms && (
                      <span className="flex items-center gap-0.5">
                        <BedDouble className="h-3 w-3" /> {listing.bedrooms}
                      </span>
                    )}
                    {listing.bathrooms && (
                      <span className="flex items-center gap-0.5">
                        <Bath className="h-3 w-3" /> {listing.bathrooms}
                      </span>
                    )}
                    {listing.max_guests_rental && (
                      <span className="flex items-center gap-0.5">
                        <Users className="h-3 w-3" /> {listing.max_guests_rental}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm">
                    {formatPrice(listing.price, listing.price_type)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal - Airbnb style */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {selectedListing && (
            <RentalDetailView
              listing={selectedListing}
              images={getImages(selectedListing)}
              currentImageIndex={currentImageIndex}
              setCurrentImageIndex={setCurrentImageIndex}
              onBook={() => handleBook(selectedListing)}
              formatPrice={formatPrice}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Book Dialog */}
      <BookServiceDialog
        open={showBookDialog}
        onOpenChange={setShowBookDialog}
        service={selectedListing as any}
      />
    </div>
  );
};

// Detail View Sub-component
const RentalDetailView = ({
  listing,
  images,
  currentImageIndex,
  setCurrentImageIndex,
  onBook,
  formatPrice,
}: {
  listing: RentalListing;
  images: string[];
  currentImageIndex: number;
  setCurrentImageIndex: (i: number) => void;
  onBook: () => void;
  formatPrice: (price: number, type: string | null) => string;
}) => {
  return (
    <div>
      {/* Image Gallery */}
      <div className="relative aspect-[16/10] bg-muted">
        {images.length > 0 ? (
          <img
            src={images[currentImageIndex]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Hotel className="h-20 w-20 text-muted-foreground/30" />
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white"
              onClick={() => setCurrentImageIndex(currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white"
              onClick={() => setCurrentImageIndex(currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentImageIndex ? 'bg-white scale-110' : 'bg-white/50'
                  }`}
                  onClick={() => setCurrentImageIndex(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Title & Host */}
        <div>
          <h1 className="text-xl font-bold">{listing.title}</h1>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm">
            <MapPin className="h-4 w-4" />
            <span>{listing.city || listing.province || listing.location_address || 'Location'}</span>
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t">
            <Avatar className="h-10 w-10">
              <AvatarImage src={listing.profiles?.avatar_url || undefined} />
              <AvatarFallback>{listing.profiles?.full_name?.[0] || 'H'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">Hosted by {listing.profiles?.full_name || 'Provider'}</p>
              <p className="text-xs text-muted-foreground">Verified host</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y">
          {listing.bedrooms && (
            <div className="text-center">
              <BedDouble className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{listing.bedrooms} Bedroom{listing.bedrooms > 1 ? 's' : ''}</p>
            </div>
          )}
          {listing.bathrooms && (
            <div className="text-center">
              <Bath className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{listing.bathrooms} Bath{listing.bathrooms > 1 ? 's' : ''}</p>
            </div>
          )}
          {listing.max_guests_rental && (
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{listing.max_guests_rental} Guest{listing.max_guests_rental > 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <div>
            <h3 className="font-semibold mb-2">About this place</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{listing.description}</p>
          </div>
        )}

        {/* Amenities */}
        {listing.amenities && listing.amenities.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">What this place offers</h3>
            <div className="grid grid-cols-2 gap-3">
              {listing.amenities.map(amenity => {
                const Icon = AMENITY_ICONS[amenity] || Shield;
                return (
                  <div key={amenity} className="flex items-center gap-3 text-sm">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span>{amenity}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Check-in / Check-out */}
        {(listing.check_in_time || listing.check_out_time) && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-xl">
            {listing.check_in_time && (
              <div>
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="font-medium">{listing.check_in_time}</p>
              </div>
            )}
            {listing.check_out_time && (
              <div>
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="font-medium">{listing.check_out_time}</p>
              </div>
            )}
          </div>
        )}

        {/* Diamond reward */}
        {listing.diamond_reward > 0 && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl text-sm">
            <span className="text-lg">💎</span>
            <span>Earn <strong>{listing.diamond_reward} diamonds</strong> when booking is completed!</span>
          </div>
        )}

        {/* Booking Footer */}
        <div className="flex items-center justify-between pt-4 border-t sticky bottom-0 bg-background pb-2">
          <div>
            <span className="text-lg font-bold">{formatPrice(listing.price, listing.price_type)}</span>
            {listing.min_stay_nights && listing.min_stay_nights > 1 && (
              <p className="text-xs text-muted-foreground">Min. {listing.min_stay_nights} nights</p>
            )}
          </div>
          <Button size="lg" className="rounded-xl px-8" onClick={onBook}>
            Reserve
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RentalListings;
