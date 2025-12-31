import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Driver {
  id: string;
  user_id: string;
  current_latitude: number;
  current_longitude: number;
  rating: number;
  total_deliveries: number;
  is_available: boolean;
  city_id: string;
}

interface DispatchScore {
  driver_id: string;
  distance_score: number;
  idle_score: number;
  rating_score: number;
  acceptance_score: number;
  total_score: number;
}

// Haversine distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate ETA based on distance (average 25km/h city traffic)
function calculateETA(distanceKm: number): number {
  const avgSpeed = 25; // km/h
  return Math.ceil((distanceKm / avgSpeed) * 60); // minutes
}

// AI-weighted scoring algorithm
function calculateDispatchScore(
  driver: Driver,
  restaurantLat: number,
  restaurantLng: number,
  maxDistance: number = 10 // km
): DispatchScore {
  const distance = calculateDistance(
    driver.current_latitude,
    driver.current_longitude,
    restaurantLat,
    restaurantLng
  );

  // Distance score (closer = higher, max 1.0)
  const distanceScore = Math.max(0, 1 - (distance / maxDistance));

  // Rating score (normalized to 0-1)
  const ratingScore = (driver.rating || 4) / 5;

  // Idle score (placeholder - would need last_order_time)
  const idleScore = 0.5;

  // Acceptance rate score (placeholder - would need historical data)
  const acceptanceScore = 0.7;

  // Weighted total (configurable weights)
  const weights = {
    distance: 0.4,
    idle: 0.2,
    rating: 0.2,
    acceptance: 0.2,
  };

  const totalScore =
    weights.distance * distanceScore +
    weights.idle * idleScore +
    weights.rating * ratingScore +
    weights.acceptance * acceptanceScore;

  return {
    driver_id: driver.id,
    distance_score: Math.round(distanceScore * 100) / 100,
    idle_score: Math.round(idleScore * 100) / 100,
    rating_score: Math.round(ratingScore * 100) / 100,
    acceptance_score: Math.round(acceptanceScore * 100) / 100,
    total_score: Math.round(totalScore * 100) / 100,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, order_id, driver_id, restaurant_lat, restaurant_lng, city_id } = await req.json();

    if (action === "find_nearest_drivers") {
      // Fetch available drivers in the same city
      const { data: drivers, error: driversError } = await supabase
        .from("delivery_riders")
        .select("*")
        .eq("status", "approved")
        .eq("is_available", true)
        .not("current_latitude", "is", null)
        .not("current_longitude", "is", null);

      if (driversError) throw driversError;

      if (!drivers || drivers.length === 0) {
        return new Response(
          JSON.stringify({ error: "No available drivers", drivers: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate scores for each driver
      const scores: DispatchScore[] = drivers.map((driver: Driver) =>
        calculateDispatchScore(driver, restaurant_lat, restaurant_lng)
      );

      // Sort by total score descending
      scores.sort((a, b) => b.total_score - a.total_score);

      // Store scores in database for analytics
      if (order_id) {
        const scoreInserts = scores.slice(0, 5).map((score) => ({
          driver_id: score.driver_id,
          order_id,
          distance_score: score.distance_score,
          idle_score: score.idle_score,
          rating_score: score.rating_score,
          acceptance_score: score.acceptance_score,
          total_score: score.total_score,
        }));

        await supabase.from("driver_dispatch_scores").insert(scoreInserts);
      }

      // Get driver details for top 5
      const topDriverIds = scores.slice(0, 5).map((s) => s.driver_id);
      const { data: topDrivers } = await supabase
        .from("delivery_riders")
        .select("*, profiles:user_id(full_name, avatar_url)")
        .in("id", topDriverIds);

      const driversWithScores = scores.slice(0, 5).map((score) => {
        const driver = topDrivers?.find((d: any) => d.id === score.driver_id);
        const distance = driver
          ? calculateDistance(
              driver.current_latitude,
              driver.current_longitude,
              restaurant_lat,
              restaurant_lng
            )
          : 0;

        return {
          ...driver,
          score: score.total_score,
          distance_km: Math.round(distance * 10) / 10,
          eta_minutes: calculateETA(distance),
        };
      });

      return new Response(
        JSON.stringify({ drivers: driversWithScores }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "auto_assign") {
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from("food_orders")
        .select("*, food_vendors(latitude, longitude, city_id)")
        .eq("id", order_id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const restaurantLat = order.food_vendors?.latitude;
      const restaurantLng = order.food_vendors?.longitude;

      if (!restaurantLat || !restaurantLng) {
        return new Response(
          JSON.stringify({ error: "Restaurant location not set" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find nearest drivers
      const { data: drivers } = await supabase
        .from("delivery_riders")
        .select("*")
        .eq("status", "approved")
        .eq("is_available", true)
        .not("current_latitude", "is", null);

      if (!drivers || drivers.length === 0) {
        return new Response(
          JSON.stringify({ error: "No available drivers", assigned: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate and rank
      const scores = drivers
        .map((d: Driver) => ({
          ...calculateDispatchScore(d, restaurantLat, restaurantLng),
          driver: d,
        }))
        .sort((a, b) => b.total_score - a.total_score);

      const bestDriver = scores[0];

      if (bestDriver.total_score < 0.1) {
        return new Response(
          JSON.stringify({ error: "No suitable drivers found", assigned: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate distance and ETA
      const distance = calculateDistance(
        bestDriver.driver.current_latitude,
        bestDriver.driver.current_longitude,
        restaurantLat,
        restaurantLng
      );
      const eta = calculateETA(distance);

      // Assign the driver
      await supabase
        .from("food_orders")
        .update({
          rider_id: bestDriver.driver_id,
          status: "assigned",
          estimated_time_minutes: eta,
          distance_km: Math.round(distance * 10) / 10,
        })
        .eq("id", order_id);

      // Create delivery assignment
      await supabase.from("delivery_assignments").insert({
        order_id,
        rider_id: bestDriver.driver_id,
        vendor_id: order.vendor_id,
        status: "assigned",
        pickup_latitude: restaurantLat,
        pickup_longitude: restaurantLng,
        customer_latitude: order.delivery_latitude,
        customer_longitude: order.delivery_longitude,
        customer_address: order.delivery_address,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        estimated_time_minutes: eta,
        distance_km: Math.round(distance * 10) / 10,
      });

      // Notify driver
      await supabase.from("notifications").insert({
        user_id: bestDriver.driver.user_id,
        type: "new_delivery",
        title: "New Delivery Assignment",
        message: `You've been assigned order #${order.order_number}. Pickup from ${order.food_vendors?.name || "restaurant"}.`,
      });

      // Mark score as assigned
      await supabase
        .from("driver_dispatch_scores")
        .update({ was_assigned: true })
        .eq("driver_id", bestDriver.driver_id)
        .eq("order_id", order_id);

      return new Response(
        JSON.stringify({
          assigned: true,
          driver_id: bestDriver.driver_id,
          eta_minutes: eta,
          distance_km: Math.round(distance * 10) / 10,
          score: bestDriver.total_score,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "calculate_delivery_fee") {
      const { distance_km, city_id: targetCityId } = await req.json();

      // Get pricing for city
      const { data: pricing } = await supabase
        .from("delivery_pricing")
        .select("*")
        .eq("city_id", targetCityId)
        .eq("is_active", true)
        .single();

      // Get active surge
      const { data: surgeRules } = await supabase
        .from("surge_rules")
        .select("*")
        .eq("city_id", targetCityId)
        .eq("is_active", true);

      let surgeMultiplier = 1.0;
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 8);

      surgeRules?.forEach((rule: any) => {
        if (rule.start_time && rule.end_time) {
          if (currentTime >= rule.start_time && currentTime <= rule.end_time) {
            surgeMultiplier = Math.max(surgeMultiplier, parseFloat(rule.multiplier));
          }
        }
      });

      const baseFee = pricing?.base_fee || 49;
      const perKmFee = pricing?.per_km_fee || 10;
      const minFee = pricing?.min_fee || 29;
      const maxFee = pricing?.max_fee || 200;

      let fee = baseFee + (distance_km * perKmFee);
      fee = fee * surgeMultiplier;
      fee = Math.max(minFee, Math.min(maxFee, fee));

      return new Response(
        JSON.stringify({
          delivery_fee: Math.round(fee * 100) / 100,
          surge_multiplier: surgeMultiplier,
          is_surging: surgeMultiplier > 1.0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Driver dispatch error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
