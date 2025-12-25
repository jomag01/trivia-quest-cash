import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GitBranch, 
  ChevronDown, 
  ChevronRight, 
  User, 
  ArrowDownLeft, 
  ArrowDownRight,
  RefreshCw,
  Users,
  Search,
  X,
  Wallet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BinaryNode {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  left_volume: number;
  right_volume: number;
  total_cycles: number;
  placement_leg: "left" | "right" | null;
  joined_at: string;
  left_child?: BinaryNode | null;
  right_child?: BinaryNode | null;
}

interface BinaryTreeViewProps {
  userId: string;
}

export default function BinaryTreeView({ userId }: BinaryTreeViewProps) {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<BinaryNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalLeft: 0,
    totalRight: 0,
    directLeft: 0,
    directRight: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BinaryNode[]>([]);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<BinaryNode | null>(null);

  const fetchBinaryTree = useCallback(async () => {
    try {
      setLoading(true);
      const tree = await buildTree(userId, 1);
      setTreeData(tree);

      if (tree) {
        const leftCount = countNodes(tree.left_child);
        const rightCount = countNodes(tree.right_child);
        setStats({
          totalLeft: leftCount,
          totalRight: rightCount,
          directLeft: tree.left_child ? 1 : 0,
          directRight: tree.right_child ? 1 : 0
        });
        setExpandedNodes(new Set([tree.id]));
      }
    } catch (error: any) {
      console.error("Error fetching binary tree:", error);
      toast.error("Failed to load binary network");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBinaryTree();
  }, [fetchBinaryTree]);

  useEffect(() => {
    if (!searchQuery.trim() || !treeData) {
      setSearchResults([]);
      return;
    }

    const results: BinaryNode[] = [];
    const searchLower = searchQuery.toLowerCase();

    const searchTree = (node: BinaryNode | null | undefined) => {
      if (!node) return;
      
      const nameMatch = node.full_name?.toLowerCase().includes(searchLower);
      const emailMatch = node.email.toLowerCase().includes(searchLower);
      
      if (nameMatch || emailMatch) {
        results.push(node);
      }
      
      searchTree(node.left_child);
      searchTree(node.right_child);
    };

    searchTree(treeData);
    setSearchResults(results);
  }, [searchQuery, treeData]);

  const countNodes = (node: BinaryNode | null | undefined): number => {
    if (!node) return 0;
    return 1 + countNodes(node.left_child) + countNodes(node.right_child);
  };

  const buildTree = async (nodeUserId: string, level: number): Promise<BinaryNode | null> => {
    if (level > 10) return null;

    const { data: networkData, error: networkError } = await supabase
      .from("binary_network")
      .select("*")
      .eq("user_id", nodeUserId)
      .maybeSingle();

    if (networkError) throw networkError;
    if (!networkData) return null;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("id", nodeUserId)
      .maybeSingle();

    if (profileError) {
      console.warn("BinaryTreeView: unable to load profile for node", nodeUserId, profileError);
    }

    const safeEmail = profileData?.email || `member-${nodeUserId.slice(0, 6)}@network`;

    const node: BinaryNode = {
      id: networkData.id,
      user_id: nodeUserId,
      full_name: profileData?.full_name || null,
      email: safeEmail,
      avatar_url: profileData?.avatar_url || null,
      left_volume: networkData.left_volume || 0,
      right_volume: networkData.right_volume || 0,
      total_cycles: networkData.total_cycles || 0,
      placement_leg: networkData.placement_leg,
      joined_at: networkData.joined_at || networkData.created_at,
      left_child: null,
      right_child: null
    };

    if (networkData.left_child_id) {
      const { data: leftChild } = await supabase
        .from("binary_network")
        .select("user_id")
        .eq("id", networkData.left_child_id)
        .maybeSingle();

      if (leftChild) {
        node.left_child = await buildTree(leftChild.user_id, level + 1);
      }
    }

    if (networkData.right_child_id) {
      const { data: rightChild } = await supabase
        .from("binary_network")
        .select("user_id")
        .eq("id", networkData.right_child_id)
        .maybeSingle();

      if (rightChild) {
        node.right_child = await buildTree(rightChild.user_id, level + 1);
      }
    }

    return node;
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

  const expandPathToNode = (targetNode: BinaryNode) => {
    const findPath = (node: BinaryNode | null | undefined, path: string[]): string[] | null => {
      if (!node) return null;
      if (node.id === targetNode.id) return [...path, node.id];
      
      const leftPath = findPath(node.left_child, [...path, node.id]);
      if (leftPath) return leftPath;
      
      const rightPath = findPath(node.right_child, [...path, node.id]);
      if (rightPath) return rightPath;
      
      return null;
    };

    if (treeData) {
      const path = findPath(treeData, []);
      if (path) {
        setExpandedNodes(new Set(path));
        setHighlightedNodeId(targetNode.id);
        setTimeout(() => setHighlightedNodeId(null), 3000);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  const renderNodeCard = (node: BinaryNode, isRoot: boolean = false, depth: number = 0) => {
    const hasChildren = node.left_child || node.right_child;
    const isExpanded = expandedNodes.has(node.id);
    const isHighlighted = highlightedNodeId === node.id;
    const isSelected = selectedNode?.id === node.id;

    const bgGradient = isRoot 
      ? "from-primary/20 to-primary/5" 
      : "from-slate-400/10 to-slate-500/5";
    const borderColor = isRoot 
      ? "border-primary/50" 
      : "border-slate-400/30";

    return (
      <div key={node.id} className="w-full">
        <div
          className={`
            relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
            bg-gradient-to-br ${bgGradient} ${borderColor}
            ${isHighlighted ? 'ring-2 ring-yellow-500 ring-offset-2 animate-pulse' : ''}
            ${isSelected ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : ''}
            hover:shadow-md hover:scale-[1.01]
          `}
          style={{ marginLeft: `${Math.min(depth * 16, 48)}px` }}
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

            <Avatar className={`h-10 w-10 sm:h-12 sm:w-12 shrink-0 ${isRoot ? 'bg-gradient-to-br from-primary to-primary/60' : 'bg-gradient-to-br from-slate-500 to-slate-600'}`}>
              {node.avatar_url && <AvatarImage src={node.avatar_url} />}
              <AvatarFallback className="text-white font-bold text-sm">
                {getInitials(node.full_name, node.email)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {node.full_name || node.email.split("@")[0]}
                </p>
                {isRoot && (
                  <Badge variant="default" className="text-[10px]">You</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400">
                  <ArrowDownLeft className="w-3 h-3 mr-1" />
                  ₱{node.left_volume.toLocaleString()}
                </Badge>
                <Badge variant="outline" className="text-[10px] sm:text-xs bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400">
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                  ₱{node.right_volume.toLocaleString()}
                </Badge>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
              <Badge variant="secondary" className="text-xs">
                <Wallet className="w-3 h-3 mr-1" />
                {node.total_cycles} cycles
              </Badge>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 ml-4 sm:ml-6">
            {/* Left Child */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-blue-500 font-medium pl-2">
                <ArrowDownLeft className="w-4 h-4" />
                <span>Left Leg</span>
              </div>
              {node.left_child ? (
                renderNodeCard(node.left_child, false, 0)
              ) : (
                <div className="p-4 border-2 border-dashed border-blue-300/30 rounded-xl text-center bg-blue-500/5">
                  <User className="w-8 h-8 mx-auto mb-2 text-blue-400/50" />
                  <p className="text-xs text-muted-foreground">Empty Position</p>
                </div>
              )}
            </div>

            {/* Right Child */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-green-500 font-medium pl-2">
                <ArrowDownRight className="w-4 h-4" />
                <span>Right Leg</span>
              </div>
              {node.right_child ? (
                renderNodeCard(node.right_child, false, 0)
              ) : (
                <div className="p-4 border-2 border-dashed border-green-300/30 rounded-xl text-center bg-green-500/5">
                  <User className="w-8 h-8 mx-auto mb-2 text-green-400/50" />
                  <p className="text-xs text-muted-foreground">Empty Position</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 pb-4">
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
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-3 sm:p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Left Leg</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-500">{stats.totalLeft}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-3 sm:p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
                <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Right Leg</p>
                <p className="text-xl sm:text-2xl font-bold text-green-500">{stats.totalRight}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-3 sm:p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Team</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-500">{stats.totalLeft + stats.totalRight}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-3 sm:p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">My Cycles</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-500">{treeData?.total_cycles || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur">
                <GitBranch className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Binary Network Tree</CardTitle>
                <p className="text-white/80 text-sm">Your binary placement structure</p>
              </div>
            </div>

            <Button 
              variant="secondary" 
              size="sm" 
              onClick={fetchBinaryTree}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Search */}
        <CardContent className="p-4 bg-gradient-to-b from-indigo-500/5 to-transparent">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
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

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-3 p-3 bg-accent/30 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-xs font-medium mb-2">Found {searchResults.length} member(s):</p>
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-2 bg-background rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => {
                      expandPathToNode(result);
                      setSearchQuery("");
                    }}
                  >
                    <Avatar className="h-8 w-8 shrink-0 bg-gradient-to-br from-primary to-primary/60">
                      {result.avatar_url && <AvatarImage src={result.avatar_url} />}
                      <AvatarFallback className="text-white text-xs">
                        {getInitials(result.full_name, result.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {result.full_name || result.email.split("@")[0]}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {result.placement_leg === "left" ? "L" : result.placement_leg === "right" ? "R" : "Root"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tree View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px]">
            <div className="p-4">
              {treeData ? (
                renderNodeCard(treeData, true)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No binary network data</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Selected Node Details */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/5 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Member Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 bg-gradient-to-br from-primary to-primary/60">
                    {selectedNode.avatar_url && <AvatarImage src={selectedNode.avatar_url} />}
                    <AvatarFallback className="text-white font-bold text-xl">
                      {getInitials(selectedNode.full_name, selectedNode.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg">
                      {selectedNode.full_name || selectedNode.email.split("@")[0]}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedNode.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                      Left Volume
                    </span>
                    <span className="font-bold text-blue-500">₱{selectedNode.left_volume.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-lg">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-green-500" />
                      Right Volume
                    </span>
                    <span className="font-bold text-green-500">₱{selectedNode.right_volume.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Total Cycles</span>
                    <span className="font-bold text-lg">{selectedNode.total_cycles}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Placement</span>
                    <Badge variant="outline">
                      {selectedNode.placement_leg === "left" ? "Left Leg" : 
                       selectedNode.placement_leg === "right" ? "Right Leg" : "Root"}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Joined</span>
                    <span className="font-semibold text-sm">{formatDate(selectedNode.joined_at)}</span>
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
}
