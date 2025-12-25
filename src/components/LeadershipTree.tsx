import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Users, 
  User, 
  Crown,
  Search,
  X,
  RefreshCw,
  Award,
  ChevronDown,
  ChevronRight,
  Star
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeadershipNode {
  id: string;
  full_name: string | null;
  email: string | null;
  referral_code: string;
  is_manager: boolean;
  current_step: number;
  created_at: string;
  level: number;
  line_number: number;
  children: LeadershipNode[];
}

interface LeadershipTreeProps {
  userId: string;
}

export const LeadershipTree = ({ userId }: LeadershipTreeProps) => {
  const [lineOneTree, setLineOneTree] = useState<LeadershipNode | null>(null);
  const [lineTwoTree, setLineTwoTree] = useState<LeadershipNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<LeadershipNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [maxStep, setMaxStep] = useState(0);
  const [activeLineTab, setActiveLineTab] = useState<string>('line1');
  const [managerStats, setManagerStats] = useState({ line1Managers: 0, line2Managers: 0 });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      fetchMaxStep();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && maxStep > 0) {
      fetchLeadershipTree();
    }
  }, [userId, maxStep]);

  const fetchMaxStep = async () => {
    const { data } = await supabase
      .from("stair_step_config")
      .select("step_number")
      .eq("active", true)
      .order("step_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setMaxStep(data?.step_number || 0);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLeadershipTree();
    setIsRefreshing(false);
    toast.success("Leadership tree refreshed");
  };

  const fetchLeadershipTree = async () => {
    try {
      setLoading(true);
      
      const { data: directReferrals } = await supabase
        .from("profiles")
        .select("id, full_name, email, referral_code, created_at")
        .eq("referred_by", userId);

      if (!directReferrals || directReferrals.length === 0) {
        setLineOneTree(null);
        setLineTwoTree(null);
        setLoading(false);
        return;
      }

      let line1Managers = 0;
      let line2Managers = 0;

      if (directReferrals[0]) {
        const line1 = await buildTree(directReferrals[0].id, 1, 1);
        setLineOneTree(line1);
        line1Managers = countManagers(line1);
        setExpandedNodes(prev => new Set([...prev, line1.id]));
      }

      if (directReferrals[1]) {
        const line2 = await buildTree(directReferrals[1].id, 1, 2);
        setLineTwoTree(line2);
        line2Managers = countManagers(line2);
        setExpandedNodes(prev => new Set([...prev, line2.id]));
      }

      setManagerStats({ line1Managers, line2Managers });
    } catch (error: any) {
      console.error("Error fetching leadership tree:", error);
      toast.error("Failed to load leadership tree");
    } finally {
      setLoading(false);
    }
  };

  const countManagers = (node: LeadershipNode): number => {
    let count = node.is_manager ? 1 : 0;
    node.children.forEach(child => {
      count += countManagers(child);
    });
    return count;
  };

  const buildTree = async (nodeId: string, level: number, lineNumber: number): Promise<LeadershipNode> => {
    const { data: nodeData, error: nodeError } = await supabase
      .from("profiles")
      .select("id, full_name, email, referral_code, created_at")
      .eq("id", nodeId)
      .single();

    if (nodeError) throw nodeError;

    const { data: rankData } = await supabase
      .from("affiliate_current_rank")
      .select("current_step")
      .eq("user_id", nodeId)
      .maybeSingle();

    const currentStep = rankData?.current_step || 0;
    const isManager = currentStep === maxStep;

    const node: LeadershipNode = {
      id: nodeData.id,
      full_name: nodeData.full_name,
      email: nodeData.email,
      referral_code: nodeData.referral_code,
      is_manager: isManager,
      current_step: currentStep,
      created_at: nodeData.created_at,
      level,
      line_number: lineNumber,
      children: [],
    };

    if (level < 7) {
      const { data: children, error: childError } = await supabase
        .from("profiles")
        .select("id")
        .eq("referred_by", nodeId);

      if (childError) throw childError;

      if (children && children.length > 0) {
        node.children = await Promise.all(
          children.map((child) => buildTree(child.id, level + 1, lineNumber))
        );
      }
    }

    return node;
  };

  const searchNodes = (node: LeadershipNode | null, query: string): Set<string> => {
    const matches = new Set<string>();
    if (!node) return matches;
    
    const lowerQuery = query.toLowerCase();
    
    const checkNode = (n: LeadershipNode) => {
      const nameMatch = n.full_name?.toLowerCase().includes(lowerQuery);
      const emailMatch = n.email?.toLowerCase().includes(lowerQuery);
      
      if (nameMatch || emailMatch) {
        matches.add(n.id);
      }
      n.children.forEach(checkNode);
    };
    
    checkNode(node);
    return matches;
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightedNodes(new Set());
      return;
    }
    
    const matches1 = searchNodes(lineOneTree, searchQuery);
    const matches2 = searchNodes(lineTwoTree, searchQuery);
    const allMatches = new Set([...matches1, ...matches2]);
    setHighlightedNodes(allMatches);
    
    if (allMatches.size > 0) {
      toast.success(`Found ${allMatches.size} matching member${allMatches.size !== 1 ? 's' : ''}`);
    }
  }, [searchQuery, lineOneTree, lineTwoTree]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    if (email) return email.substring(0, 2).toUpperCase();
    return "??";
  };

  const renderNodeCard = (node: LeadershipNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isHighlighted = highlightedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;

    const bgGradient = node.is_manager 
      ? "from-yellow-400/20 to-amber-500/10" 
      : "from-slate-400/10 to-slate-500/5";
    const borderColor = node.is_manager 
      ? "border-yellow-500/50" 
      : "border-slate-400/30";
    const avatarColor = node.is_manager 
      ? "bg-gradient-to-br from-yellow-500 to-amber-500" 
      : "bg-gradient-to-br from-slate-500 to-slate-600";

    return (
      <div key={node.id} className="w-full">
        <div
          className={`
            relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
            bg-gradient-to-br ${bgGradient} ${borderColor}
            ${isHighlighted ? 'ring-2 ring-yellow-500 ring-offset-2' : ''}
            ${isSelected ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : ''}
            ${node.is_manager ? 'shadow-md' : ''}
            hover:shadow-md hover:scale-[1.01]
          `}
          style={{ marginLeft: `${Math.min(depth * 16, 64)}px` }}
          onClick={() => setSelectedNode(node)}
        >
          <div className="flex items-center gap-3">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            {!hasChildren && <div className="w-8" />}

            <Avatar className={`h-10 w-10 sm:h-12 sm:w-12 shrink-0 ${avatarColor}`}>
              <AvatarFallback className="text-white font-bold text-sm">
                {node.is_manager ? "👑" : getInitials(node.full_name, node.email)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {node.full_name || node.email?.split("@")[0] || "Anonymous"}
                </p>
                {node.is_manager && (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[10px] sm:text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Manager
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                <span>Step {node.current_step}</span>
                <span>•</span>
                <span>Level {node.level}</span>
                {hasChildren && (
                  <>
                    <span>•</span>
                    <span>{node.children.length} refs</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2 border-l-2 border-dashed border-muted ml-4 sm:ml-6 pl-2">
            {node.children.map((child) => renderNodeCard(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl ml-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lineOneTree && !lineTwoTree) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
            <Crown className="w-8 h-8 text-yellow-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Leadership Data</h3>
          <p className="text-muted-foreground">Build your referral lines to see managers here</p>
        </CardContent>
      </Card>
    );
  }

  const qualifies2Line = managerStats.line1Managers > 0 && managerStats.line2Managers > 0;

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Line 1 Managers</p>
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  {managerStats.line1Managers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Line 2 Managers</p>
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {managerStats.line2Managers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2-Line Qualification Status */}
      <Card className={`overflow-hidden border-0 shadow-md ${qualifies2Line ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/5' : 'bg-gradient-to-r from-amber-500/10 to-orange-500/5'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${qualifies2Line ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'}`}>
              <Award className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-base sm:text-lg">
                {qualifies2Line ? '✅ 2-Line Requirement Met!' : '⏳ 2-Line Requirement Pending'}
              </p>
              <p className="text-sm text-muted-foreground">
                {qualifies2Line 
                  ? 'You qualify for the 2% leadership bonus from your Manager downlines' 
                  : 'Build managers in both lines to earn 2% leadership bonus'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header & Tabs */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-white pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Leadership Network</CardTitle>
                <p className="text-white/80 text-sm">View managers in your referral lines</p>
              </div>
            </div>

            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Search & Tabs */}
        <CardContent className="p-4 bg-gradient-to-b from-yellow-500/5 to-transparent space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search managers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Tabs value={activeLineTab} onValueChange={setActiveLineTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="line1" className="gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Line 1
                {managerStats.line1Managers > 0 && (
                  <Badge variant="secondary" className="ml-1">{managerStats.line1Managers}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="line2" className="gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Line 2
                {managerStats.line2Managers > 0 && (
                  <Badge variant="secondary" className="ml-1">{managerStats.line2Managers}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Tree View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px]">
            <div className="p-4 space-y-3">
              {activeLineTab === 'line1' && lineOneTree && renderNodeCard(lineOneTree)}
              {activeLineTab === 'line2' && lineTwoTree && renderNodeCard(lineTwoTree)}
              {activeLineTab === 'line1' && !lineOneTree && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No Line 1 data yet</p>
                </div>
              )}
              {activeLineTab === 'line2' && !lineTwoTree && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No Line 2 data yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Selected Node Details */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-yellow-500/10 to-amber-500/5 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Member Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className={`h-16 w-16 ${selectedNode.is_manager ? 'bg-gradient-to-br from-yellow-500 to-amber-500' : 'bg-gradient-to-br from-slate-500 to-slate-600'}`}>
                    <AvatarFallback className="text-white font-bold text-xl">
                      {selectedNode.is_manager ? "👑" : getInitials(selectedNode.full_name, selectedNode.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">
                        {selectedNode.full_name || selectedNode.email?.split("@")[0]}
                      </p>
                      {selectedNode.is_manager && (
                        <Crown className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedNode.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={selectedNode.is_manager ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white' : ''}>
                      {selectedNode.is_manager ? (
                        <>
                          <Crown className="w-3 h-3 mr-1" />
                          Manager
                        </>
                      ) : (
                        <>
                          <Star className="w-3 h-3 mr-1" />
                          Step {selectedNode.current_step}
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Level</span>
                    <span className="font-semibold">Level {selectedNode.level}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Line</span>
                    <Badge variant="outline">Line {selectedNode.line_number}</Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Direct Referrals</span>
                    <span className="font-semibold">{selectedNode.children.length}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Joined</span>
                    <span className="font-semibold text-sm">
                      {new Date(selectedNode.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a member to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
