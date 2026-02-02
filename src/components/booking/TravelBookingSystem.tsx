import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addDays, differenceInDays } from "date-fns";
import { 
  Search, MapPin, Calendar as CalendarIcon, Users, Star, 
  Plane, Hotel, Car, Clock, CreditCard, CheckCircle, 
  AlertCircle, ChevronRight, Navigation, Wifi, Coffee, 
  UtensilsCrossed, Waves, Mountain, Sun
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TravelService {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  diamond_reward: number;
  provider_id: string;
  destinations: string[];
  inclusions: string[];
  max_guests: number;
  meeting_point: string;
  package_type: string;
  latitude: number | null;
  longitude: number | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface BookingSettings {
  downpayment_percentage: number;
  downpayment_enabled: boolean;
  min_days_advance_booking: number;
  max_guests_per_booking: number;
}

const PACKAGE_ICONS: Record<string, any> = {
  hotel: Hotel,
  tour: Plane,
  transfer: Car,
  complete_package: Mountain,
  day_tour: Sun,
};

const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi,
  breakfast: Coffee,
  meals: UtensilsCrossed,
  pool: Waves,
};

const TravelBookingSystem = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<TravelService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedService, setSelectedService] = useState<TravelService | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [settings, setSettings] = useState<BookingSettings>({
    downpayment_percentage: 30,
    downpayment_enabled: true,
    min_days_advance_booking: 1,
    max_guests_per_booking: 10,
  });

  // Booking form state
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined);
  const [guests, setGuests] = useState(1);
  const [guestNames, setGuestNames] = useState<string[]>([""]);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchTravelServices();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("travel_booking_settings")
      .select("setting_key, setting_value");
    
    if (data) {
      const settingsMap: any = {};
      data.forEach((s: any) => {
        if (s.setting_key === "downpayment_enabled") {
          settingsMap[s.setting_key] = s.setting_value === "true";
        } else {
          settingsMap[s.setting_key] = parseFloat(s.setting_value) || s.setting_value;
        }
      });
      setSettings(prev => ({ ...prev, ...settingsMap }));
    }
  };

  const fetchTravelServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select(`
        *,
        profiles!services_provider_id_fkey (full_name, avatar_url)
      `)
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .in("category", ["Travel & Tours", "Travel", "Tour Packages", "Transportation"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setServices(data as unknown as TravelService[]);
    }
    setLoading(false);
  };

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = !searchQuery || 
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDestination = !destination ||
        service.destinations?.some(d => d.toLowerCase().includes(destination.toLowerCase())) ||
        service.meeting_point?.toLowerCase().includes(destination.toLowerCase());
      return matchesSearch && matchesDestination;
    });
  }, [services, searchQuery, destination]);

  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    return Math.max(1, differenceInDays(checkOutDate, checkInDate));
  };

  const calculateTotal = () => {
    if (!selectedService) return 0;
    const nights = calculateNights();
    return selectedService.price * Math.max(1, nights) * guests;
  };

  const calculateDownpayment = () => {
    if (!settings.downpayment_enabled) return calculateTotal();
    return Math.ceil(calculateTotal() * (settings.downpayment_percentage / 100));
  };

  const handleGuestChange = (count: number) => {
    setGuests(count);
    const newNames = [...guestNames];
    while (newNames.length < count) newNames.push("");
    while (newNames.length > count) newNames.pop();
    setGuestNames(newNames);
  };

  const handleBook = (service: TravelService) => {
    setSelectedService(service);
    setShowBookingDialog(true);
    setStep(1);
    setCheckInDate(undefined);
    setCheckOutDate(undefined);
    setGuests(1);
    setGuestNames([""]);
    setSpecialRequests("");
  };

  const handleConfirmBooking = async () => {
    if (!user || !selectedService || !checkInDate) {
      toast.error("Please complete all required fields");
      return;
    }

    if (selectedService.provider_id === user.id) {
      toast.error("You cannot book your own service");
      return;
    }

    setBookingLoading(true);

    try {
      const totalAmount = calculateTotal();
      const downpaymentAmount = calculateDownpayment();

      const { error } = await supabase.from("service_bookings").insert({
        service_id: selectedService.id,
        customer_id: user.id,
        provider_id: selectedService.provider_id,
        booking_date: format(checkInDate, "yyyy-MM-dd"),
        start_time: "14:00:00",
        end_time: "12:00:00",
        total_amount: totalAmount,
        downpayment_amount: downpaymentAmount,
        full_payment_amount: totalAmount - downpaymentAmount,
        number_of_guests: guests,
        check_in_date: format(checkInDate, "yyyy-MM-dd"),
        check_out_date: checkOutDate ? format(checkOutDate, "yyyy-MM-dd") : null,
        guest_names: guestNames.filter(n => n.trim()),
        contact_phone: contactPhone,
        contact_email: contactEmail || user.email,
        special_requests: specialRequests,
        booking_type: "travel",
        status: "pending",
        payment_status: "awaiting_downpayment",
        notes: `Travel booking - ${guests} guest(s)`,
      });

      if (error) throw error;

      toast.success("Booking submitted! Please complete downpayment to confirm.");
      setShowBookingDialog(false);
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error("Failed to create booking");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Search Section - Booking.com Style */}
      <div className="bg-gradient-to-r from-primary/90 to-primary rounded-xl p-4 text-primary-foreground">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Travel Booking
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Where to?"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-9 bg-background text-foreground"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tours, hotels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background text-foreground"
            />
          </div>
          <Button variant="secondary" className="w-full">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {["All", "Tours", "Hotels", "Transfers", "Packages"].map(filter => (
          <Badge
            key={filter}
            variant={filter === "All" ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap px-3 py-1"
          >
            {filter}
          </Badge>
        ))}
      </div>

      {/* Results */}
      {filteredServices.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No travel packages found. Try adjusting your search.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map(service => {
            const PackageIcon = PACKAGE_ICONS[service.package_type] || Plane;
            return (
              <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-all group">
                <div className="flex">
                  {/* Image */}
                  <div className="w-32 h-32 flex-shrink-0 bg-muted relative overflow-hidden">
                    {service.image_url ? (
                      <img 
                        src={service.image_url} 
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PackageIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    {service.diamond_reward > 0 && (
                      <Badge className="absolute top-1 left-1 text-[10px] bg-amber-500">
                        💎 +{service.diamond_reward}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <CardContent className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm line-clamp-1">{service.title}</h3>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          <PackageIcon className="h-3 w-3 mr-1" />
                          {service.package_type || "Tour"}
                        </Badge>
                      </div>
                      
                      {service.destinations?.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{service.destinations.join(", ")}</span>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {service.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={service.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {service.profiles?.full_name?.[0] || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1 text-xs text-amber-500">
                          <Star className="h-3 w-3 fill-current" />
                          <span>4.8</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">From</p>
                        <p className="font-bold text-primary">₱{service.price.toLocaleString()}</p>
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full mt-2 h-8 text-xs"
                      onClick={() => handleBook(service)}
                    >
                      Book Now
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              Book: {selectedService?.title}
            </DialogTitle>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                {s < 3 && <div className={cn("w-8 h-0.5", step > s ? "bg-primary" : "bg-muted")} />}
              </div>
            ))}
          </div>
          <div className="flex justify-center text-xs text-muted-foreground gap-8 -mt-1">
            <span>Dates</span>
            <span>Guests</span>
            <span>Confirm</span>
          </div>

          {/* Step 1: Dates */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4" />
                  Check-in Date
                </Label>
                <Calendar
                  mode="single"
                  selected={checkInDate}
                  onSelect={setCheckInDate}
                  disabled={(date) => date < addDays(new Date(), settings.min_days_advance_booking - 1)}
                  className="rounded-md border"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4" />
                  Check-out Date (Optional)
                </Label>
                <Calendar
                  mode="single"
                  selected={checkOutDate}
                  onSelect={setCheckOutDate}
                  disabled={(date) => !checkInDate || date <= checkInDate}
                  className="rounded-md border"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={() => setStep(2)}
                disabled={!checkInDate}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Guests */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  Number of Guests
                </Label>
                <Select 
                  value={guests.toString()} 
                  onValueChange={(v) => handleGuestChange(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.min(settings.max_guests_per_booking, selectedService?.max_guests || 10) }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1} Guest{i > 0 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {guestNames.map((name, idx) => (
                <div key={idx}>
                  <Label>Guest {idx + 1} Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => {
                      const newNames = [...guestNames];
                      newNames[idx] = e.target.value;
                      setGuestNames(newNames);
                    }}
                    placeholder={`Guest ${idx + 1} full name`}
                  />
                </div>
              ))}

              <div>
                <Label>Contact Phone</Label>
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>

              <div>
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={user?.email || "email@example.com"}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Special Requests</Label>
                <Textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special requests or notes..."
                  rows={3}
                />
              </div>

              {/* Booking Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">Booking Summary</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Package:</span>
                    <span className="font-medium">{selectedService?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in:</span>
                    <span>{checkInDate ? format(checkInDate, "MMM d, yyyy") : "-"}</span>
                  </div>
                  {checkOutDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-out:</span>
                      <span>{format(checkOutDate, "MMM d, yyyy")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guests:</span>
                    <span>{guests}</span>
                  </div>
                  {calculateNights() > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nights:</span>
                      <span>{calculateNights()}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="text-primary">₱{calculateTotal().toLocaleString()}</span>
                  </div>
                  {settings.downpayment_enabled && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Downpayment ({settings.downpayment_percentage}%):
                      </span>
                      <span className="text-amber-600 font-medium">
                        ₱{calculateDownpayment().toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {settings.downpayment_enabled && (
                <Alert className="bg-amber-500/10 border-amber-500/20">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                    A {settings.downpayment_percentage}% downpayment (₱{calculateDownpayment().toLocaleString()}) is required to confirm your booking.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleConfirmBooking} 
                  disabled={bookingLoading}
                  className="flex-1"
                >
                  {bookingLoading ? "Processing..." : "Confirm Booking"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TravelBookingSystem;
