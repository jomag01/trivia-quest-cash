import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Shield,
  Users,
  MessageCircle,
  TrendingUp,
  Search,
  RefreshCw,
  Ban,
  UserMinus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Report {
  id: string;
  reported_user_id: string;
  reporter_user_id: string;
  room_id: string | null;
  reason: string;
  description: string | null;
  severity: number;
  status: string;
  auto_action: string | null;
  admin_notes: string | null;
  created_at: string;
  reported_user?: { full_name: string | null; avatar_url: string | null };
  reporter_user?: { full_name: string | null };
}

interface Stats {
  totalReports: number;
  pendingReports: number;
  totalMatches: number;
  activeChats: number;
}

export default function ChatMateModeration() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    pendingReports: 0,
    totalMatches: 0,
    activeChats: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch reports with user info
      let query = supabase
        .from("chatmate_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      // Get user profiles for reports
      if (reportsData && reportsData.length > 0) {
        const userIds = [
          ...new Set([
            ...reportsData.map((r) => r.reported_user_id),
            ...reportsData.map((r) => r.reporter_user_id),
          ]),
        ];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]));

        const enrichedReports = reportsData.map((r) => ({
          ...r,
          reported_user: profileMap.get(r.reported_user_id),
          reporter_user: profileMap.get(r.reporter_user_id),
        }));

        setReports(enrichedReports);
      } else {
        setReports([]);
      }

      // Fetch stats
      const [
        { count: totalReports },
        { count: pendingReports },
        { count: totalMatches },
        { count: activeChats },
      ] = await Promise.all([
        supabase.from("chatmate_reports").select("*", { count: "exact", head: true }),
        supabase.from("chatmate_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("chat_matches").select("*", { count: "exact", head: true }).eq("status", "accepted"),
        supabase.from("chatmate_rooms").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalReports: totalReports || 0,
        pendingReports: pendingReports || 0,
        totalMatches: totalMatches || 0,
        activeChats: activeChats || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load moderation data");
    } finally {
      setLoading(false);
    }
  };

  const handleReportAction = async (action: "resolved" | "dismissed", banUser: boolean = false) => {
    if (!selectedReport) return;

    setActionLoading(true);
    try {
      // Update report status
      await supabase
        .from("chatmate_reports")
        .update({
          status: action,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          auto_action: banUser ? "ban" : null,
        })
        .eq("id", selectedReport.id);

      // If banning user, disable their chat and reduce trust score
      if (banUser) {
        // Disable chat
        await supabase
          .from("profiles")
          .update({ is_chat_enabled: false })
          .eq("id", selectedReport.reported_user_id);

        // Reduce trust score manually
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("trust_score")
          .eq("id", selectedReport.reported_user_id)
          .single();

        const newScore = Math.max(0, (currentProfile?.trust_score || 100) - 20);
        await supabase
          .from("profiles")
          .update({ trust_score: newScore })
          .eq("id", selectedReport.reported_user_id);
      }

      toast.success(
        action === "resolved"
          ? banUser
            ? "Report resolved and user banned from chat"
            : "Report marked as resolved"
          : "Report dismissed"
      );

      setSelectedReport(null);
      setAdminNotes("");
      fetchData();
    } catch (error) {
      console.error("Error processing report:", error);
      toast.error("Failed to process report");
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return "bg-red-500";
    if (severity >= 3) return "bg-orange-500";
    if (severity >= 2) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const filteredReports = reports.filter((r) =>
    searchQuery
      ? r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reported_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">BeesMate Moderation</h2>
          <p className="text-muted-foreground">Review reports and manage chat safety</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingReports}</p>
                <p className="text-xs text-muted-foreground">Pending Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReports}</p>
                <p className="text-xs text-muted-foreground">Total Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalMatches}</p>
                <p className="text-xs text-muted-foreground">Total Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <MessageCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeChats}</p>
                <p className="text-xs text-muted-foreground">Active Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Reports ({filteredReports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No reports found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={report.reported_user?.avatar_url || ""} />
                    <AvatarFallback>
                      {(report.reported_user?.full_name || "?")[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {report.reported_user?.full_name || "Unknown User"}
                      </span>
                      <Badge className={`${getSeverityColor(report.severity)} text-white`}>
                        Severity {report.severity}
                      </Badge>
                      <Badge
                        variant={
                          report.status === "pending"
                            ? "outline"
                            : report.status === "resolved"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {report.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">{report.reason}</p>

                    {report.description && (
                      <p className="text-sm mt-2 line-clamp-2">{report.description}</p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        Reported by: {report.reporter_user?.full_name || "Unknown"}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {report.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Take action on this report
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarImage src={selectedReport.reported_user?.avatar_url || ""} />
                    <AvatarFallback>
                      {(selectedReport.reported_user?.full_name || "?")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedReport.reported_user?.full_name || "Unknown User"}
                    </p>
                    <p className="text-sm text-muted-foreground">Reported User</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Reason:</span> {selectedReport.reason}
                  </div>
                  {selectedReport.description && (
                    <div>
                      <span className="font-medium">Details:</span> {selectedReport.description}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Severity:</span>{" "}
                    <Badge className={`${getSeverityColor(selectedReport.severity)} text-white`}>
                      Level {selectedReport.severity}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleReportAction("dismissed")}
              disabled={actionLoading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleReportAction("resolved", false)}
              disabled={actionLoading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Resolve
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReportAction("resolved", true)}
              disabled={actionLoading}
            >
              <Ban className="w-4 h-4 mr-2" />
              Resolve & Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
