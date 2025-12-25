import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  User, 
  Search,
  X,
  RefreshCw,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Star
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface StairStepNode {
  id: string;
  full_name: string | null;
  email: string | null;
  referral_code: string;
  current_step: number;
  step_name: string;
  commission_rate: number;
  created_at: string;
  level: number;
  children: StairStepNode[];
}

interface StairStepConfig {
  step_number: number;
  step_name: string;
  commission_percentage: number;
}

interface StairStepTreeProps {
  userId: string;
}

export const StairStepTree = ({ userId }: StairStepTreeProps) => {
  const [treeData, setTreeData] = useState<StairStepNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<StairStepNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stairStepConfig, setStairStepConfig] = useState<StairStepConfig[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  useEffect(() => {
    if (userId) {
      fetchStairStepConfig();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && stairStepConfig.length > 0) {
      fetchStairStepTree();
    }
  }, [userId, stairStepConfig]);

  const fetchStairStepConfig = async () => {
    const { data } = await supabase
      .from("stair_step_config")
      .select("step_number, step_name, commission_percentage")
      .eq("active", true)
      .order("step_number", { ascending: true });
    
    setStairStepConfig(data || []);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStairStepTree();
    setIsRefreshing(false);
    toast.success("Stair-step tree refreshed");
  };

  const fetchStairStepTree = async () => {
    try {
      setLoading(true);
      const tree = await buildTree(userId, 1);
      setTreeData(tree);
      if (tree) {
        setExpandedNodes(new Set([tree.id]));
      }
    } catch (error: any) {
      console.error("Error fetching stair-step tree:", error);
      toast.error("Failed to load stair-step tree");
    } finally {
      setLoading(false);
    }
  };

  const getStepInfo = (stepNumber: number) => {
    const config = stairStepConfig.find(s => s.step_number === stepNumber);
    return config || { step_name: `Step ${stepNumber}`, commission_percentage: 0 };
  };

  const buildTree = async (nodeId: string, level: number): Promise<StairStepNode> => {
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
    const stepInfo = getStepInfo(currentStep);

    const node: StairStepNode = {
      id: nodeData.id,
      full_name: nodeData.full_name,
      email: nodeData.email,
      referral_code: nodeData.referral_code,
      current_step: currentStep,
      step_name: stepInfo.step_name,
      commission_rate: stepInfo.commission_percentage,
      created_at: nodeData.created_at,
      level,
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
          children.map((child) => buildTree(child.id, level + 1))
        );
      }
    }

    return node;
  };

  const searchNodes = (node: StairStepNode, query: string): Set<string> => {
    const matches = new Set<string>();
    const lowerQuery = query.toLowerCase();
    
    const checkNode = (n: StairStepNode) => {
      const nameMatch = n.full_name?.toLowerCase().includes(lowerQuery);
      const emailMatch = n.email?.toLowerCase().includes(lowerQuery);
      const stepMatch = n.step_name?.toLowerCase().includes(lowerQuery);
      
      if (nameMatch || emailMatch || stepMatch) {
        matches.add(n.id);
      }
      n.children.forEach(checkNode);
    };
    
    checkNode(node);
    return matches;
  };

  useEffect(() => {
    if (!treeData || !searchQuery.trim()) {
      setHighlightedNodes(new Set());
      return;
    }
    
    const matches = searchNodes(treeData, searchQuery);
    setHighlightedNodes(matches);
    
    if (matches.size > 0) {
      toast.success(`Found ${matches.size} matching member${matches.size !== 1 ? 's' : ''}`);
    }
  }, [searchQuery, treeData]);

  const getStepGradient = (step: number): { bg: string; border: string; text: string } => {
    const gradients = [
      { bg: "from-slate-400/20 to-slate-500/10", border: "border-slate-400/50", text: "text-slate-600 dark:text-slate-300" },
      { bg: "from-amber-400/20 to-orange-500/10", border: "border-amber-400/50", text: "text-amber-600 dark:text-amber-300" },
      { bg: "from-gray-300/20 to-gray-400/10", border: "border-gray-400/50", text: "text-gray-600 dark:text-gray-300" },
      { bg: "from-yellow-400/20 to-amber-500/10", border: "border-yellow-500/50", text: "text-yellow-600 dark:text-yellow-300" },
      { bg: "from-red-400/20 to-rose-500/10", border: "border-red-500/50", text: "text-red-600 dark:text-red-300" },
      { bg: "from-blue-400/20 to-indigo-500/10", border: "border-blue-500/50", text: "text-blue-600 dark:text-blue-300" },
      { bg: "from-emerald-400/20 to-green-500/10", border: "border-emerald-500/50", text: "text-emerald-600 dark:text-emerald-300" },
      { bg: "from-purple-400/20 to-violet-500/10", border: "border-purple-500/50", text: "text-purple-600 dark:text-purple-300" },
    ];
    return gradients[Math.min(step, gradients.length - 1)];
  };

  const getStepBadgeColor = (step: number): string => {
    const colors = [
      "bg-slate-500",
      "bg-gradient-to-r from-amber-500 to-orange-500",
      "bg-gradient-to-r from-gray-400 to-gray-500",
      "bg-gradient-to-r from-yellow-500 to-amber-500",
      "bg-gradient-to-r from-red-500 to-rose-500",
      "bg-gradient-to-r from-blue-500 to-indigo-500",
      "bg-gradient-to-r from-emerald-500 to-green-500",
      "bg-gradient-to-r from-purple-500 to-violet-500",
    ];
    return colors[Math.min(step, colors.length - 1)];
  };

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

  const countTotalMembers = (node: StairStepNode): number => {
    return 1 + node.children.reduce((sum, child) => sum + countTotalMembers(child), 0);
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    if (email) return email.substring(0, 2).toUpperCase();
    return "??";
  };

  const renderNodeCard = (node: StairStepNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isHighlighted = highlightedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const gradient = getStepGradient(node.current_step);

    return (
      <div key={node.id} className="w-full">
        <div
          className={`
            relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
            bg-gradient-to-br ${gradient.bg} ${gradient.border}
            ${isHighlighted ? 'ring-2 ring-yellow-500 ring-offset-2' : ''}
            ${isSelected ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : ''}
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

            <Avatar className={`h-10 w-10 sm:h-12 sm:w-12 shrink-0 ${getStepBadgeColor(node.current_step)}`}>
              <AvatarFallback className="text-white font-bold text-sm">
                {getInitials(node.full_name, node.email)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {node.full_name || node.email?.split("@")[0] || "Anonymous"}
                </p>
                <Badge className={`${getStepBadgeColor(node.current_step)} text-white text-[10px] sm:text-xs px-2 py-0.5`}>
                  <Star className="w-3 h-3 mr-1" />
                  {node.step_name}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                <span>Level {node.level}</span>
                <span>•</span>
                <span>{node.commission_rate}% commission</span>
                {hasChildren && (
                  <>
                    <span>•</span>
                    <span>{node.children.length} referrals</span>
                  </>
                )}
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
              <Badge variant="outline" className={`${gradient.text} text-xs`}>
                Step {node.current_step}
              </Badge>
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
        <CardHeader className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 pb-4">
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
            <Skeleton className="h-20 w-full rounded-xl ml-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!treeData) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Stair-Step Data</h3>
          <p className="text-muted-foreground">Build your network to see your stair-step tree</p>
        </CardContent>
      </Card>
    );
  }

  const totalMembers = countTotalMembers(treeData);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Stair-Step Network</CardTitle>
                <p className="text-white/80 text-sm">{totalMembers} members in network</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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
          </div>
        </CardHeader>

        {/* Search & Legend */}
        <CardContent className="p-4 bg-gradient-to-b from-orange-500/5 to-transparent">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or step..."
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
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-2">
            {stairStepConfig.map((step) => (
              <Badge
                key={step.step_number}
                className={`${getStepBadgeColor(step.step_number)} text-white text-xs`}
              >
                <Star className="w-3 h-3 mr-1" />
                {step.step_name} ({step.commission_percentage}%)
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tree View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px]">
            <div className="p-4 space-y-3">
              {renderNodeCard(treeData)}
            </div>
          </ScrollArea>
        </Card>

        {/* Selected Node Details */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Member Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className={`h-16 w-16 ${getStepBadgeColor(selectedNode.current_step)}`}>
                    <AvatarFallback className="text-white font-bold text-xl">
                      {getInitials(selectedNode.full_name, selectedNode.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg">
                      {selectedNode.full_name || selectedNode.email?.split("@")[0]}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedNode.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Rank</span>
                    <Badge className={`${getStepBadgeColor(selectedNode.current_step)} text-white`}>
                      <Star className="w-3 h-3 mr-1" />
                      {selectedNode.step_name}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Commission Rate</span>
                    <span className="font-bold text-lg">{selectedNode.commission_rate}%</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Level</span>
                    <span className="font-semibold">Level {selectedNode.level}</span>
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
