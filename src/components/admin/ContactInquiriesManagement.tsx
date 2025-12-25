import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  Send,
  Loader2,
  User,
  Bot,
  Lightbulb,
  RefreshCw,
  Search,
  Eye
} from "lucide-react";

interface Inquiry {
  id: string;
  visitor_email: string;
  visitor_name: string | null;
  subject: string | null;
  message: string;
  conversation_history: any;
  ai_recommended_actions: any;
  status: string;
  admin_notes: string | null;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

const ContactInquiriesManagement = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contact_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (error: any) {
      console.error("Error fetching inquiries:", error);
      toast.error("Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (inquiryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("contact_inquiries")
        .update({ status: newStatus })
        .eq("id", inquiryId);

      if (error) throw error;

      setInquiries(prev => prev.map(i => i.id === inquiryId ? { ...i, status: newStatus } : i));
      toast.success("Status updated");
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const sendReply = async () => {
    if (!selectedInquiry || !replyMessage.trim()) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("contact-assistant", {
        body: {
          action: "admin-reply",
          inquiryId: selectedInquiry.id,
          message: replyMessage.trim()
        }
      });

      if (error) throw error;

      toast.success(data.emailSent ? "Reply sent via email!" : "Reply saved (email service not configured)");
      setReplyDialogOpen(false);
      setReplyMessage("");
      fetchInquiries();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><AlertCircle className="w-3 h-3 mr-1" />In Progress</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      case "archived":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30"><Archive className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInquiries = inquiries.filter(i => {
    const matchesSearch = searchQuery === "" || 
      i.visitor_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: inquiries.length,
    pending: inquiries.filter(i => i.status === "pending").length,
    inProgress: inquiries.filter(i => i.status === "in_progress").length,
    resolved: inquiries.filter(i => i.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-blue-500">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-purple-500">{stats.inProgress}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchInquiries}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inquiries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Inquiries</CardTitle>
          <CardDescription>Manage visitor inquiries and respond via email</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No inquiries found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInquiries.map((inquiry) => (
                  <TableRow key={inquiry.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inquiry.visitor_name || "Anonymous"}</p>
                        <p className="text-sm text-muted-foreground">{inquiry.visitor_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {inquiry.subject || inquiry.message?.substring(0, 50)}
                    </TableCell>
                    <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                    <TableCell>
                      {new Date(inquiry.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInquiry(inquiry)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedInquiry(inquiry);
                            setReplyDialogOpen(true);
                          }}
                          className="bg-gradient-to-r from-blue-500 to-purple-500"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Inquiry Dialog */}
      <Dialog open={!!selectedInquiry && !replyDialogOpen} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
            <DialogDescription>
              From: {selectedInquiry?.visitor_name || "Anonymous"} ({selectedInquiry?.visitor_email})
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Status Update */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Status:</span>
                <Select 
                  value={selectedInquiry?.status || "pending"} 
                  onValueChange={(value) => selectedInquiry && updateStatus(selectedInquiry.id, value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI Recommended Actions */}
              {selectedInquiry?.ai_recommended_actions && selectedInquiry.ai_recommended_actions.length > 0 && (
                <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      AI Recommended Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedInquiry.ai_recommended_actions.map((action: any, index: number) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-background/50 rounded">
                          <Badge variant={action.priority === "high" ? "destructive" : action.priority === "medium" ? "default" : "secondary"}>
                            {action.priority}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{action.action}</p>
                            <p className="text-xs text-muted-foreground">{action.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conversation History */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Conversation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedInquiry?.conversation_history?.map((msg: any, index: number) => (
                      <div key={index} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          msg.role === "user" ? "bg-blue-500/10" : "bg-muted"
                        }`}>
                          <div className="flex items-center gap-1 mb-1">
                            {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                            <span className="text-xs font-medium">{msg.role === "user" ? "Visitor" : "AI"}</span>
                          </div>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Previous Response */}
              {selectedInquiry?.admin_response && (
                <Card className="bg-green-500/5 border-green-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-600">Admin Response</CardTitle>
                    <CardDescription>
                      Sent on {selectedInquiry.responded_at ? new Date(selectedInquiry.responded_at).toLocaleString() : "N/A"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedInquiry.admin_response}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInquiry(null)}>Close</Button>
            <Button 
              onClick={() => setReplyDialogOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {selectedInquiry?.visitor_name || selectedInquiry?.visitor_email}</DialogTitle>
            <DialogDescription>
              Your response will be sent to {selectedInquiry?.visitor_email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Write your response..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={6}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={sendReply}
              disabled={isSending || !replyMessage.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactInquiriesManagement;
