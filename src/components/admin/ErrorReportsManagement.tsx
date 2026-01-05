import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Bug, 
  Search, 
  Eye, 
  Loader2, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Download,
  ClipboardCopy
} from "lucide-react";
import { format } from "date-fns";

interface ErrorReport {
  id: string;
  user_id: string | null;
  user_email: string | null;
  error_type: string;
  error_title: string;
  error_description: string;
  screenshot_url: string | null;
  page_url: string | null;
  browser_info: string | null;
  device_info: string | null;
  status: string;
  priority: string;
  admin_notes: string | null;
  created_at: string;
  signature?: string | null;
  occurrence_count?: number | null;
  last_occurred_at?: string | null;
}

export default function ErrorReportsManagement() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("error_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (data || []) as ErrorReport[];

      // Group similar reports so duplicates don't flood the admin list
      // (same type + same title + same page)
      const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
      const signatureOf = (r: ErrorReport) => [norm(r.error_type), norm(r.error_title), norm(r.page_url)].join("|");

      const groupedMap = new Map<string, ErrorReport>();
      for (const r of list) {
        const sig = signatureOf(r);
        const existing = groupedMap.get(sig);
        if (!existing) {
          groupedMap.set(sig, {
            ...r,
            signature: sig,
            occurrence_count: 1,
            last_occurred_at: r.created_at,
          });
        } else {
          groupedMap.set(sig, {
            ...existing,
            occurrence_count: (existing.occurrence_count || 1) + 1,
            last_occurred_at: existing.last_occurred_at && new Date(existing.last_occurred_at) > new Date(r.created_at)
              ? existing.last_occurred_at
              : r.created_at,
          });
        }
      }

      // Keep newest first
      const grouped = Array.from(groupedMap.values()).sort(
        (a, b) => new Date(b.last_occurred_at || b.created_at).getTime() - new Date(a.last_occurred_at || a.created_at).getTime()
      );

      setReports(grouped);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load error reports");
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (report: ErrorReport) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || "");
    setDetailOpen(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedReport) return;

    setUpdating(true);
    try {
      const updateData: any = {
        status: newStatus,
        admin_notes: adminNotes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "resolved") {
        updateData.resolved_by = user?.id;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("error_reports")
        .update(updateData)
        .eq("id", selectedReport.id);

      if (error) throw error;

      toast.success(`Report marked as ${newStatus}`);
      setDetailOpen(false);
      fetchReports();
    } catch (error: any) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePriority = async (reportId: string, priority: string) => {
    try {
      const { error } = await supabase
        .from("error_reports")
        .update({ priority, updated_at: new Date().toISOString() })
        .eq("id", reportId);

      if (error) throw error;
      toast.success("Priority updated");
      fetchReports();
    } catch (error: any) {
      console.error("Error updating priority:", error);
      toast.error("Failed to update priority");
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchQuery || 
      report.error_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "in_progress": return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case "resolved": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "closed": return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-muted";
    }
  };

  const pendingCount = reports.filter(r => r.status === "pending").length;

  const exportCsv = (items: ErrorReport[]) => {
    const headers = [
      "id",
      "status",
      "priority",
      "error_type",
      "error_title",
      "user_email",
      "page_url",
      "created_at",
      "screenshot_url",
      "occurrence_count",
      "last_occurred_at",
    ];

    const escape = (value: unknown) => {
      const str = String(value ?? "");
      if (/[\n\r,\"]/g.test(str)) {
        return `\"${str.replace(/\"/g, '\"\"')}\"`;
      }
      return str;
    };

    const rows = items.map((r) => [
      r.id,
      r.status,
      r.priority,
      r.error_type,
      r.error_title,
      r.user_email ?? "",
      r.page_url ?? "",
      r.created_at,
      r.screenshot_url ?? "",
      r.occurrence_count ?? 1,
      r.last_occurred_at ?? "",
    ].map(escape).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportJson = (items: ErrorReport[]) => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-reports-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyForLovable = async (report: ErrorReport) => {
    const text = [
      "Fix request (from in-app bug report):",
      `Title: ${report.error_title}`,
      `Type: ${report.error_type}`,
      `Status: ${report.status} | Priority: ${report.priority}`,
      report.occurrence_count ? `Occurrences: ${report.occurrence_count}` : null,
      report.page_url ? `URL: ${report.page_url}` : null,
      report.user_email ? `Reporter: ${report.user_email}` : null,
      report.screenshot_url ? `Screenshot: ${report.screenshot_url}` : null,
      "---",
      report.error_description,
    ].filter(Boolean).join("\n");

    await navigator.clipboard.writeText(text);
    toast.success("Copied for Lovable fix");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-destructive" />
                Error Reports
                {pendingCount > 0 && (
                  <Badge variant="destructive">{pendingCount} pending</Badge>
                )}
              </CardTitle>
              <CardDescription>
                User-submitted bug reports and issues
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCsv(filteredReports)}
                disabled={loading || filteredReports.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportJson(filteredReports)}
                disabled={loading || filteredReports.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={fetchReports}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bug className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No error reports found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(report.status)}
                          <span className="text-xs capitalize">{report.status.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={report.priority}
                          onValueChange={(val) => handleUpdatePriority(report.id, val)}
                        >
                          <SelectTrigger className="h-7 text-xs w-24">
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${getPriorityColor(report.priority)}`} />
                              <span className="capitalize">{report.priority}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        <span>{report.error_title}</span>
                        {(report.occurrence_count || 1) > 1 && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            x{report.occurrence_count}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {report.error_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {report.user_email || "Anonymous"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(report.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReport && getStatusIcon(selectedReport.status)}
              Error Report Details
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">{selectedReport.error_title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge variant="outline" className="capitalize">{selectedReport.error_type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="text-sm">{selectedReport.user_email || "Anonymous"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-sm">{format(new Date(selectedReport.created_at), "PPpp")}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedReport.error_description}
                </p>
              </div>

              {selectedReport.screenshot_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Screenshot</p>
                  <a 
                    href={selectedReport.screenshot_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={selectedReport.screenshot_url}
                      alt="Error screenshot"
                      className="w-full max-h-64 object-contain rounded-lg border cursor-pointer hover:opacity-90"
                    />
                  </a>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 text-xs">
                {selectedReport.page_url && (
                  <div>
                    <p className="text-muted-foreground">Page URL</p>
                    <a 
                      href={selectedReport.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {selectedReport.page_url.substring(0, 50)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {selectedReport.device_info && (
                  <div>
                    <p className="text-muted-foreground">Device</p>
                    <p>{selectedReport.device_info}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Admin Notes</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this report..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
            {selectedReport && (
              <Button
                variant="secondary"
                onClick={() => copyForLovable(selectedReport)}
              >
                <ClipboardCopy className="w-4 h-4 mr-1" />
                Copy for Fix
              </Button>
            )}
            <div className="flex gap-2">
              {selectedReport?.status !== "in_progress" && (
                <Button
                  variant="secondary"
                  onClick={() => handleUpdateStatus("in_progress")}
                  disabled={updating}
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  Mark In Progress
                </Button>
              )}
              {selectedReport?.status !== "resolved" && (
                <Button
                  onClick={() => handleUpdateStatus("resolved")}
                  disabled={updating}
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                  Mark Resolved
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
