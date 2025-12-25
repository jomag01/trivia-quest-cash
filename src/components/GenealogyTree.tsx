import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Users, 
  User, 
  Search,
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Verified,
  Coins
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TreeNode {
  id: string;
  full_name: string | null;
  email: string | null;
  referral_code: string;
  credits: number;
  created_at: string;
  level: number;
  children: TreeNode[];
  is_verified: boolean | null;
  referred_by: string | null;
  referrer?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface GenealogyTreeProps {
  userId: string;
}

export const GenealogyTree = ({ userId }: GenealogyTreeProps) => {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      fetchNetworkTree();
    }
  }, [userId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNetworkTree();
    setIsRefreshing(false);
    toast.success("Network tree refreshed");
  };

  const fetchNetworkTree = async () => {
    try {
      setLoading(true);
      const tree = await buildTree(userId, 1);
      setTreeData(tree);
      if (tree) {
        setExpandedNodes(new Set([tree.id]));
      }
    } catch (error: any) {
      console.error("Error fetching network tree:", error);
      toast.error("Failed to load network tree");
    } finally {
      setLoading(false);
    }
  };

  const buildTree = async (nodeId: string, level: number): Promise<TreeNode> => {
    const { data: nodeData, error: nodeError } = await supabase
      .from("profiles")
      .select("id, full_name, email, referral_code, credits, created_at, is_verified, referred_by")
      .eq("id", nodeId)
      .single();

    if (nodeError) throw nodeError;

    let referrerData = null;
    if (nodeData.referred_by) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", nodeData.referred_by)
        .maybeSingle();
      referrerData = referrer;
    }

    const node: TreeNode = {
      id: nodeData.id,
      full_name: nodeData.full_name,
      email: nodeData.email,
      referral_code: nodeData.referral_code,
      credits: nodeData.credits,
      created_at: nodeData.created_at,
      is_verified: nodeData.is_verified,
      referred_by: nodeData.referred_by,
      referrer: referrerData,
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

  const searchNodes = (node: TreeNode, query: string): Set<string> => {
    const matches = new Set<string>();
    const lowerQuery = query.toLowerCase();
    
    const checkNode = (n: TreeNode) => {
      const nameMatch = n.full_name?.toLowerCase().includes(lowerQuery);
      const emailMatch = n.email?.toLowerCase().includes(lowerQuery);
      const codeMatch = n.referral_code?.toLowerCase().includes(lowerQuery);
      
      if (nameMatch || emailMatch || codeMatch) {
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

  const getLevelGradient = (level: number): { bg: string; border: string; avatar: string } => {
    const gradients = [
      { bg: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/50", avatar: "bg-gradient-to-br from-blue-500 to-cyan-500" },
      { bg: "from-purple-500/20 to-pink-500/10", border: "border-purple-500/50", avatar: "bg-gradient-to-br from-purple-500 to-pink-500" },
      { bg: "from-green-500/20 to-emerald-500/10", border: "border-green-500/50", avatar: "bg-gradient-to-br from-green-500 to-emerald-500" },
      { bg: "from-orange-500/20 to-red-500/10", border: "border-orange-500/50", avatar: "bg-gradient-to-br from-orange-500 to-red-500" },
      { bg: "from-teal-500/20 to-blue-500/10", border: "border-teal-500/50", avatar: "bg-gradient-to-br from-teal-500 to-blue-500" },
      { bg: "from-rose-500/20 to-pink-500/10", border: "border-rose-500/50", avatar: "bg-gradient-to-br from-rose-500 to-pink-500" },
      { bg: "from-indigo-500/20 to-purple-500/10", border: "border-indigo-500/50", avatar: "bg-gradient-to-br from-indigo-500 to-purple-500" },
    ];
    return gradients[(level - 1) % gradients.length];
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

  const countTotalMembers = (node: TreeNode): number => {
    return 1 + node.children.reduce((sum, child) => sum + countTotalMembers(child), 0);
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    if (email) return email.substring(0, 2).toUpperCase();
    return "??";
  };

  const renderNodeCard = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isHighlighted = highlightedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const gradient = getLevelGradient(node.level);

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

            <Avatar className={`h-10 w-10 sm:h-12 sm:w-12 shrink-0 ${gradient.avatar}`}>
              <AvatarFallback className="text-white font-bold text-sm">
                {getInitials(node.full_name, node.email)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {node.full_name || node.email?.split("@")[0] || "Anonymous"}
                </p>
                {node.is_verified && (
                  <Verified className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  L{node.level}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  ₱{node.credits?.toLocaleString() || 0}
                </span>
                {hasChildren && (
                  <>
                    <span>•</span>
                    <span>{node.children.length} referrals</span>
                  </>
                )}
              </div>
            </div>

            <div className="hidden sm:block shrink-0">
              <Badge className={`${gradient.avatar} text-white text-xs`}>
                Level {node.level}
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
        <CardHeader className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 pb-4">
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Network Data</h3>
          <p className="text-muted-foreground">Start referring to build your network</p>
        </CardContent>
      </Card>
    );
  }

  const totalMembers = countTotalMembers(treeData);

  return (
    <div className="space-y-4">
      {/* Upline Info */}
      {treeData?.referrer && (
        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 bg-gradient-to-br from-primary to-primary/60">
                <AvatarFallback className="text-white font-bold">
                  {getInitials(treeData.referrer.full_name, treeData.referrer.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Your Upline / Referrer</p>
                <p className="font-semibold truncate">
                  {treeData.referrer.full_name || treeData.referrer.email?.split('@')[0]}
                </p>
                <p className="text-sm text-muted-foreground truncate">{treeData.referrer.email}</p>
              </div>
              <Badge variant="outline" className="border-primary shrink-0">
                <User className="w-3 h-3 mr-1" />
                Upline
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Network Genealogy</CardTitle>
                <p className="text-white/80 text-sm">{totalMembers} members in your network</p>
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

        {/* Search */}
        <CardContent className="p-4 bg-gradient-to-b from-blue-500/5 to-transparent">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or referral code..."
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
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/5 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Member Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className={`h-16 w-16 ${getLevelGradient(selectedNode.level).avatar}`}>
                    <AvatarFallback className="text-white font-bold text-xl">
                      {getInitials(selectedNode.full_name, selectedNode.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">
                        {selectedNode.full_name || selectedNode.email?.split("@")[0]}
                      </p>
                      {selectedNode.is_verified && (
                        <Verified className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedNode.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Level</span>
                    <Badge className={`${getLevelGradient(selectedNode.level).avatar} text-white`}>
                      Level {selectedNode.level}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Credits</span>
                    <span className="font-bold text-lg">₱{selectedNode.credits?.toLocaleString() || 0}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Referral Code</span>
                    <Badge variant="outline" className="font-mono">{selectedNode.referral_code}</Badge>
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
