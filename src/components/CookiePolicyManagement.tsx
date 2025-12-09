import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Cookie, Link, Share2, Users, Video, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LinkTrackingStats {
  link_type: string;
  total_visits: number;
  conversions: number;
  conversion_rate: number;
}

export const CookiePolicyManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cookieDuration, setCookieDuration] = useState("90");
  const [trackReferralLinks, setTrackReferralLinks] = useState(true);
  const [trackProductLinks, setTrackProductLinks] = useState(true);
  const [trackAffiliateLinks, setTrackAffiliateLinks] = useState(true);
  const [stats, setStats] = useState<LinkTrackingStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("treasure_admin_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "cookie_duration_days",
          "track_referral_links",
          "track_product_links",
          "track_affiliate_links"
        ]);

      if (error) throw error;

      if (data) {
        for (const item of data) {
          switch (item.setting_key) {
            case "cookie_duration_days":
              setCookieDuration(item.setting_value);
              break;
            case "track_referral_links":
              setTrackReferralLinks(item.setting_value === "true");
              break;
            case "track_product_links":
              setTrackProductLinks(item.setting_value === "true");
              break;
            case "track_affiliate_links":
              setTrackAffiliateLinks(item.setting_value === "true");
              break;
          }
        }
      }
    } catch (error) {
      console.error("Error fetching cookie settings:", error);
      toast.error("Failed to load cookie settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      
      // Get stats by link type
      const { data, error } = await supabase
        .from("link_tracking")
        .select("link_type, converted");

      if (error) throw error;

      const statsMap: Record<string, { total: number; converted: number }> = {};
      
      if (data) {
        for (const item of data) {
          if (!statsMap[item.link_type]) {
            statsMap[item.link_type] = { total: 0, converted: 0 };
          }
          statsMap[item.link_type].total++;
          if (item.converted) {
            statsMap[item.link_type].converted++;
          }
        }
      }

      const formattedStats: LinkTrackingStats[] = Object.entries(statsMap).map(([type, data]) => ({
        link_type: type,
        total_visits: data.total,
        conversions: data.converted,
        conversion_rate: data.total > 0 ? (data.converted / data.total) * 100 : 0
      }));

      setStats(formattedStats);
    } catch (error) {
      console.error("Error fetching link stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, []);

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("treasure_admin_settings")
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_at: new Date().toISOString()
        }, { onConflict: "setting_key" });

      if (error) throw error;
      toast.success("Setting updated successfully");
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const getLinkTypeIcon = (type: string) => {
    switch (type) {
      case "referral":
        return <Users className="w-4 h-4" />;
      case "product":
        return <Share2 className="w-4 h-4" />;
      case "live_stream":
        return <Video className="w-4 h-4" />;
      default:
        return <Link className="w-4 h-4" />;
    }
  };

  const getLinkTypeLabel = (type: string) => {
    switch (type) {
      case "referral":
        return "Referral Links";
      case "product":
        return "Product Links";
      case "live_stream":
        return "Live Stream Links";
      case "affiliate":
        return "Affiliate Links";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cookie className="w-5 h-5 text-orange-500" />
            <CardTitle className="text-lg">Cookie Policy Settings</CardTitle>
          </div>
          <CardDescription>
            Configure how affiliate and referral links are tracked via cookies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cookie Duration */}
          <div className="space-y-2">
            <Label>Cookie Duration (Days)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="90"
                value={cookieDuration}
                onChange={(e) => setCookieDuration(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">Max: 90 days</span>
              <Button
                size="sm"
                onClick={() => handleUpdateSetting("cookie_duration_days", Math.min(90, parseInt(cookieDuration) || 90).toString())}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              How long referral cookies remain valid before expiring
            </p>
          </div>

          {/* Tracking Toggles */}
          <div className="space-y-4">
            <Label>Link Tracking Options</Label>
            
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Referral Links</p>
                  <p className="text-xs text-muted-foreground">Track signup referral links</p>
                </div>
              </div>
              <Switch
                checked={trackReferralLinks}
                onCheckedChange={(checked) => {
                  setTrackReferralLinks(checked);
                  handleUpdateSetting("track_referral_links", checked.toString());
                }}
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Product Links</p>
                  <p className="text-xs text-muted-foreground">Track product share links for commissions</p>
                </div>
              </div>
              <Switch
                checked={trackProductLinks}
                onCheckedChange={(checked) => {
                  setTrackProductLinks(checked);
                  handleUpdateSetting("track_product_links", checked.toString());
                }}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Affiliate Links</p>
                  <p className="text-xs text-muted-foreground">Track all other affiliate links</p>
                </div>
              </div>
              <Switch
                checked={trackAffiliateLinks}
                onCheckedChange={(checked) => {
                  setTrackAffiliateLinks(checked);
                  handleUpdateSetting("track_affiliate_links", checked.toString());
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Link Tracking Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Link Tracking Statistics</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loadingStats}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingStats ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No link tracking data yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link Type</TableHead>
                  <TableHead className="text-right">Total Visits</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Conversion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow key={stat.link_type}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getLinkTypeIcon(stat.link_type)}
                        {getLinkTypeLabel(stat.link_type)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{stat.total_visits}</TableCell>
                    <TableCell className="text-right">{stat.conversions}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={stat.conversion_rate > 5 ? "default" : "secondary"}>
                        {stat.conversion_rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
