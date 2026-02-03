import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ShoppingBag, Calendar as CalendarIcon, Users, Star,
  Plane, Clock, CreditCard, CheckCircle, AlertCircle, MapPin,
  Phone, Mail, ChevronRight, Home, Save
} from "lucide-react";

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  diamond_reward: number;
  provider_id: string;
  destinations: string[];
  includes: string[];
  max_guests: number;
  meeting_point: string;
  package_type: string;
  service_type: string;
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

interface SavedBookingState {
  checkInDate: string | null;
  checkOutDate: string | null;
  guests: number;
  guestNames: string[];
  contactPhone: string;
  contactEmail: string;
  specialRequests: string;
  step: number;
  savedAt: number;
}

const STORAGE_KEY_PREFIX = "booking_draft_";

const BookService = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
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
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  // Load saved draft from localStorage
  const loadSavedDraft = useCallback(() => {
    if (!serviceId) return;
    
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${serviceId}`);
    if (saved) {
      try {
        const draft: SavedBookingState = JSON.parse(saved);
        // Only load if saved within last 24 hours
        if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
          if (draft.checkInDate) setCheckInDate(new Date(draft.checkInDate));
          if (draft.checkOutDate) setCheckOutDate(new Date(draft.checkOutDate));
          setGuests(draft.guests || 1);
          setGuestNames(draft.guestNames?.length ? draft.guestNames : [""]);
          setContactPhone(draft.contactPhone || "");
          setContactEmail(draft.contactEmail || "");
          setSpecialRequests(draft.specialRequests || "");
          setStep(draft.step || 1);
          setHasSavedDraft(true);
          toast.info("Restored your previous booking progress");
        }
      } catch (e) {
        console.error("Error loading draft:", e);
      }
    }
  }, [serviceId]);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!serviceId) return;
    
    const draft: SavedBookingState = {
      checkInDate: checkInDate?.toISOString() || null,
      checkOutDate: checkOutDate?.toISOString() || null,
      guests,
      guestNames,
      contactPhone,
      contactEmail,
      specialRequests,
      step,
      savedAt: Date.now(),
    };
    
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${serviceId}`, JSON.stringify(draft));
  }, [serviceId, checkInDate, checkOutDate, guests, guestNames, contactPhone, contactEmail, specialRequests, step]);

  // Auto-save on changes
  useEffect(() => {
    if (service) {
      saveDraft();
    }
  }, [checkInDate, checkOutDate, guests, guestNames, contactPhone, contactEmail, specialRequests, step, service, saveDraft]);

  // Clear draft after successful booking
  const clearDraft = () => {
    if (serviceId) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${serviceId}`);
    }
  };

  useEffect(() => {
    if (serviceId) {
      fetchService();
      fetchSettings();
    }
  }, [serviceId]);

  // Load draft after service is fetched
  useEffect(() => {
    if (service) {
      loadSavedDraft();
    }
  }, [service, loadSavedDraft]);

  // Pre-fill email if logged in
  useEffect(() => {
    if (user?.email && !contactEmail) {
      setContactEmail(user.email);
    }
  }, [user]);

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

  const fetchService = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select(`
        *,
        profiles!services_provider_id_fkey (full_name, avatar_url)
      `)
      .eq("id", serviceId)
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .single();

    if (error || !data) {
      setNotFound(true);
    } else {
      setService(data as unknown as Service);
    }
    setLoading(false);
  };

  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    return Math.max(1, differenceInDays(checkOutDate, checkInDate));
  };

  const calculateTotal = () => {
    if (!service) return 0;
    const nights = calculateNights();
    return service.price * Math.max(1, nights) * guests;
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

  const handleConfirmBooking = async () => {
    if (!user) {
      toast.error("Please log in to book");
      navigate("/auth");
      return;
    }

    if (!service || !checkInDate) {
      toast.error("Please complete all required fields");
      return;
    }

    if (service.provider_id === user.id) {
      toast.error("You cannot book your own service");
      return;
    }

    setBookingLoading(true);

    try {
      const totalAmount = calculateTotal();
      const downpaymentAmount = calculateDownpayment();

      const { error } = await supabase.from("service_bookings").insert({
        service_id: service.id,
        customer_id: user.id,
        provider_id: service.provider_id,
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
        booking_type: service.service_type === "travel_tour" ? "travel" : "standard",
        status: "pending",
        payment_status: "awaiting_downpayment",
        notes: `Booking via direct link - ${guests} guest(s)`,
      });

      if (error) throw error;

      clearDraft();
      toast.success("Booking submitted! Please complete downpayment to confirm.");
      navigate("/dashboard?tab=orders");
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error("Failed to create booking");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full rounded-xl mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold mb-2">Service Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This booking link may have expired or the service is no longer available.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/shop")}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse Shop
              </Button>
              <Button onClick={() => navigate("/booking")}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                All Services
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Minimal Header with Toggle */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex items-center gap-2">
              {hasSavedDraft && (
                <Badge variant="secondary" className="gap-1">
                  <Save className="h-3 w-3" />
                  Draft Saved
                </Badge>
              )}
              <Link to="/shop">
                <Button variant="outline" size="sm" className="gap-1">
                  <Home className="h-4 w-4" />
                  Shop
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Service Card */}
        <Card className="overflow-hidden mb-6">
          {service?.image_url && (
            <div className="aspect-video w-full overflow-hidden">
              <img 
                src={service.image_url} 
                alt={service.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{service?.title}</h1>
                {service?.destinations?.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    <span>{service.destinations.join(", ")}</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                  {service?.description}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-2xl font-bold text-primary">₱{service?.price.toLocaleString()}</p>
                {service?.diamond_reward > 0 && (
                  <Badge variant="secondary" className="mt-1">💎 +{service.diamond_reward}</Badge>
                )}
              </div>
            </div>

            {/* Provider */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Avatar className="h-8 w-8">
                <AvatarImage src={service?.profiles?.avatar_url || undefined} />
                <AvatarFallback>{service?.profiles?.full_name?.[0] || "P"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{service?.profiles?.full_name || "Provider"}</p>
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <Star className="h-3 w-3 fill-current" />
                  <span>4.8 • Verified</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card>
          <CardContent className="p-4">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 py-3 mb-4">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                  {s < 3 && <div className={cn("w-8 h-0.5", step > s ? "bg-primary" : "bg-muted")} />}
                </div>
              ))}
            </div>
            <div className="flex justify-center text-xs text-muted-foreground gap-8 mb-6">
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
                    Check-in Date *
                  </Label>
                  <Calendar
                    mode="single"
                    selected={checkInDate}
                    onSelect={setCheckInDate}
                    disabled={(date) => date < addDays(new Date(), settings.min_days_advance_booking - 1)}
                    className="rounded-md border mx-auto"
                  />
                </div>

                {service?.service_type === "travel_tour" && (
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="h-4 w-4" />
                      Check-out Date (for multi-day tours)
                    </Label>
                    <Calendar
                      mode="single"
                      selected={checkOutDate}
                      onSelect={setCheckOutDate}
                      disabled={(date) => !checkInDate || date <= checkInDate}
                      className="rounded-md border mx-auto"
                    />
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={() => setStep(2)}
                  disabled={!checkInDate}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
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
                      {Array.from({ length: service?.max_guests || 10 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1} {i === 0 ? "Guest" : "Guests"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {guestNames.map((name, index) => (
                  <div key={index}>
                    <Label>Guest {index + 1} Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => {
                        const newNames = [...guestNames];
                        newNames[index] = e.target.value;
                        setGuestNames(newNames);
                      }}
                      placeholder={`Enter guest ${index + 1} name`}
                    />
                  </div>
                ))}

                <div>
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Phone
                  </Label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Your phone number"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Email
                  </Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Your email"
                  />
                </div>

                <div>
                  <Label>Special Requests</Label>
                  <Textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any special requirements or requests..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1">
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Booking Summary</h3>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium">{service?.title}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Check-in</span>
                    <span>{checkInDate && format(checkInDate, "MMM dd, yyyy")}</span>
                  </div>
                  {checkOutDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Check-out</span>
                      <span>{format(checkOutDate, "MMM dd, yyyy")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Guests</span>
                    <span>{guests}</span>
                  </div>
                  {calculateNights() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nights</span>
                      <span>{calculateNights()}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Amount</span>
                    <span className="font-bold text-lg">₱{calculateTotal().toLocaleString()}</span>
                  </div>
                  
                  {settings.downpayment_enabled && (
                    <Alert>
                      <CreditCard className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Downpayment Required:</strong> ₱{calculateDownpayment().toLocaleString()} ({settings.downpayment_percentage}%)
                        <br />
                        <span className="text-xs text-muted-foreground">
                          Remaining balance due before check-in
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {!user && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please <Link to="/auth" className="underline font-medium">log in</Link> to complete your booking.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleConfirmBooking}
                    disabled={bookingLoading || !user}
                    className="flex-1"
                  >
                    {bookingLoading ? "Processing..." : "Confirm Booking"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookService;
