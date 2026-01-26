import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { User, MapPin, Phone, Star, Package } from "lucide-react";

const RiderProfile = () => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["rider-profile"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      const { data: rider } = await supabase
        .from("courier_riders" as any)
        .select(`
          *,
          hub:courier_hubs(hub_name, hub_code)
        `)
        .eq("user_id", session.session.user.id)
        .single();

      if (!rider) return null;

      // Get delivery stats
      const { count: completedDeliveries } = await supabase
        .from("courier_rider_jobs")
        .select("id", { count: "exact" })
        .eq("rider_id", rider.id)
        .eq("status", "completed");

      return {
        ...rider,
        completedDeliveries: completedDeliveries || 0,
      };
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Rider profile not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-2">
            <User className="h-10 w-10 text-primary" />
          </div>
          <CardTitle>{(profile as any).rider_name || "Rider"}</CardTitle>
          <Badge variant={(profile as any).is_available ? "default" : "secondary"}>
            {(profile as any).is_available ? "Available" : "Busy"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{(profile as any).phone_number || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{(profile as any).hub?.hub_name} ({(profile as any).hub?.hub_code})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Vehicle:</span>
            <span className="capitalize">{profile.vehicle_type} - {profile.vehicle_plate}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{profile.completedDeliveries}</p>
            <p className="text-sm text-muted-foreground">Deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Star className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{profile.rating?.toFixed(1) || "N/A"}</p>
            <p className="text-sm text-muted-foreground">Rating</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Button variant="outline" className="w-full">
            Update Location
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiderProfile;
