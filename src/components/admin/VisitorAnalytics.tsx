import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Eye, MousePointerClick, ArrowUpRight, Globe, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VisitorStats {
  totalVisitors: number;
  totalPageViews: number;
  uniqueVisitorsToday: number;
  pageViewsToday: number;
  referralVisitors: number;
  convertedToUsers: number;
  convertedToAffiliates: number;
}

interface TopPage {
  page_path: string;
  view_count: number;
}

interface RecentVisitor {
  visitor_id: string;
  page_path: string;
  created_at: string;
  referral_source: string;
}

export const VisitorAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VisitorStats>({
    totalVisitors: 0,
    totalPageViews: 0,
    uniqueVisitorsToday: 0,
    pageViewsToday: 0,
    referralVisitors: 0,
    convertedToUsers: 0,
    convertedToAffiliates: 0
  });
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<RecentVisitor[]>([]);

  useEffect(() => {
    fetchAnalytics();

    // Real-time subscription
    const channel = supabase
      .channel('visitor-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_views' }, () => fetchAnalytics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_sessions' }, () => fetchAnalytics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get total visitors (unique visitor sessions)
      const { count: totalVisitors } = await supabase
        .from("visitor_sessions")
        .select("*", { count: "exact", head: true });

      // Get total page views
      const { count: totalPageViews } = await supabase
        .from("page_views")
        .select("*", { count: "exact", head: true });

      // Get unique visitors today
      const { data: todayVisitors } = await supabase
        .from("page_views")
        .select("visitor_id")
        .gte("created_at", today.toISOString());
      
      const uniqueVisitorsToday = new Set(todayVisitors?.map(v => v.visitor_id)).size;
      const pageViewsToday = todayVisitors?.length || 0;

      // Get referral visitors
      const { count: referralVisitors } = await supabase
        .from("visitor_sessions")
        .select("*", { count: "exact", head: true })
        .not("referral_user_id", "is", null);

      // Get conversions
      const { count: convertedToUsers } = await supabase
        .from("visitor_sessions")
        .select("*", { count: "exact", head: true })
        .eq("converted_to_user", true);

      const { count: convertedToAffiliates } = await supabase
        .from("visitor_sessions")
        .select("*", { count: "exact", head: true })
        .eq("converted_to_affiliate", true);

      setStats({
        totalVisitors: totalVisitors || 0,
        totalPageViews: totalPageViews || 0,
        uniqueVisitorsToday,
        pageViewsToday,
        referralVisitors: referralVisitors || 0,
        convertedToUsers: convertedToUsers || 0,
        convertedToAffiliates: convertedToAffiliates || 0
      });

      // Get top pages
      const { data: pageData } = await supabase
        .from("page_views")
        .select("page_path");
      
      const pageCounts: Record<string, number> = {};
      pageData?.forEach(p => {
        pageCounts[p.page_path] = (pageCounts[p.page_path] || 0) + 1;
      });
      
      const sortedPages = Object.entries(pageCounts)
        .map(([page_path, view_count]) => ({ page_path, view_count }))
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 10);
      
      setTopPages(sortedPages);

      // Get recent visitors
      const { data: recentData } = await supabase
        .from("page_views")
        .select("visitor_id, page_path, created_at, referral_source")
        .order("created_at", { ascending: false })
        .limit(20);
      
      setRecentVisitors(recentData || []);

    } catch (error) {
      console.error("Error fetching visitor analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalVisitors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Eye className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPageViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Page Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <ArrowUpRight className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniqueVisitorsToday}</p>
                <p className="text-xs text-muted-foreground">Visitors Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Globe className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.referralVisitors}</p>
                <p className="text-xs text-muted-foreground">Referral Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.convertedToUsers}</p>
                  <p className="text-xs text-muted-foreground">Converted to Users</p>
                </div>
              </div>
              <Badge variant="secondary">
                {stats.totalVisitors > 0 ? ((stats.convertedToUsers / stats.totalVisitors) * 100).toFixed(1) : 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.convertedToAffiliates}</p>
                  <p className="text-xs text-muted-foreground">Converted to Affiliates</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                {stats.convertedToUsers > 0 ? ((stats.convertedToAffiliates / stats.convertedToUsers) * 100).toFixed(1) : 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-primary" />
              Top Pages
            </CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {topPages.map((page, index) => (
                  <div key={page.page_path} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <span className="text-sm font-medium truncate max-w-[180px]">{page.page_path}</span>
                    </div>
                    <Badge variant="secondary">{page.view_count.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Visitors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Recent Visitors
            </CardTitle>
            <CardDescription>Latest page views</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {recentVisitors.map((visitor, index) => (
                  <div key={`${visitor.visitor_id}-${index}`} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{visitor.page_path}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(visitor.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant={visitor.referral_source === 'affiliate' ? 'default' : 'secondary'}
                      className={visitor.referral_source === 'affiliate' ? 'bg-green-500' : ''}
                    >
                      {visitor.referral_source || 'direct'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
