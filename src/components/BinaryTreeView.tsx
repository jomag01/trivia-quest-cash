import { useState, useEffect, useCallback, useRef } from "react";
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
  ChevronUp,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2
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
  const [zoom, setZoom] = useState(1);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);

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

  // Search functionality
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
    if (level > 10) return null; // Increased depth limit

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
      const { data: leftChild, error: leftChildError } = await supabase
        .from("binary_network")
        .select("user_id")
        .eq("id", networkData.left_child_id)
        .maybeSingle();

      if (leftChildError) {
        console.warn("BinaryTreeView: unable to load left child", networkData.left_child_id, leftChildError);
      } else if (leftChild) {
        node.left_child = await buildTree(leftChild.user_id, level + 1);
      }
    }

    if (networkData.right_child_id) {
      const { data: rightChild, error: rightChildError } = await supabase
        .from("binary_network")
        .select("user_id")
        .eq("id", networkData.right_child_id)
        .maybeSingle();

      if (rightChildError) {
        console.warn("BinaryTreeView: unable to load right child", networkData.right_child_id, rightChildError);
      } else if (rightChild) {
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

  const scrollToTop = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  const renderNode = (node: BinaryNode, isRoot: boolean = false) => {
    const hasChildren = node.left_child || node.right_child;
    const isExpanded = expandedNodes.has(node.id);
    const isHighlighted = highlightedNodeId === node.id;

    return (
      <div key={node.id} className="flex flex-col items-center">
        <div 
          className={`relative p-2 sm:p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
            isRoot ? "bg-primary/10 border-primary" : "bg-card"
          } ${isHighlighted ? "ring-2 ring-yellow-500 animate-pulse" : ""} w-[140px] sm:w-[180px] md:w-[200px]`}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
              {node.avatar_url && <AvatarImage src={node.avatar_url} />}
              <AvatarFallback className="bg-primary/20 text-primary text-xs sm:text-sm">
                {getInitials(node.full_name, node.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs sm:text-sm truncate">
                {node.full_name || node.email.split("@")[0]}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{node.email}</p>
            </div>
            {hasChildren && (
              <Button variant="ghost" size="sm" className="h-5 w-5 sm:h-6 sm:w-6 p-0 shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </Button>
            )}
          </div>
          
          <div className="mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs flex-wrap">
            <Badge variant="outline" className="text-[10px] sm:text-xs py-0 px-1 sm:px-2">
              <ArrowDownLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 text-blue-500" />
              ₱{node.left_volume.toLocaleString()}
            </Badge>
            <Badge variant="outline" className="text-[10px] sm:text-xs py-0 px-1 sm:px-2">
              <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 text-green-500" />
              ₱{node.right_volume.toLocaleString()}
            </Badge>
          </div>
          
          <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
            Joined: {formatDate(node.joined_at)}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2 sm:mt-4">
            <div className="flex justify-center mb-1 sm:mb-2">
              <div className="w-px h-2 sm:h-4 bg-border" />
            </div>
            <div className="flex gap-2 sm:gap-4 md:gap-8 relative">
              {node.left_child && node.right_child && (
                <div className="absolute top-0 left-1/4 right-1/4 h-px bg-border" style={{ transform: "translateY(-4px)" }} />
              )}
              
              <div className="flex flex-col items-center">
                {node.left_child && (
                  <>
                    <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2 text-[10px] sm:text-xs text-blue-500">
                      <ArrowDownLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>Left</span>
                    </div>
                    {renderNode(node.left_child)}
                  </>
                )}
                {!node.left_child && (
                  <div className="p-2 sm:p-4 border border-dashed rounded-lg text-center text-muted-foreground w-[100px] sm:w-[120px] md:w-[150px]">
                    <User className="w-4 h-4 sm:w-6 sm:h-6 mx-auto mb-0.5 sm:mb-1 opacity-50" />
                    <p className="text-[10px] sm:text-xs">Empty</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-center">
                {node.right_child && (
                  <>
                    <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2 text-[10px] sm:text-xs text-green-500">
                      <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>Right</span>
                    </div>
                    {renderNode(node.right_child)}
                  </>
                )}
                {!node.right_child && (
                  <div className="p-2 sm:p-4 border border-dashed rounded-lg text-center text-muted-foreground w-[100px] sm:w-[120px] md:w-[150px]">
                    <User className="w-4 h-4 sm:w-6 sm:h-6 mx-auto mb-0.5 sm:mb-1 opacity-50" />
                    <p className="text-[10px] sm:text-xs">Empty</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <Skeleton className="h-6 sm:h-8 w-40 sm:w-48" />
          <Skeleton className="h-8 sm:h-10 w-20 sm:w-24" />
        </div>
        <div className="flex justify-center">
          <Skeleton className="h-24 sm:h-32 w-full max-w-[16rem]" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <GitBranch className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
          <div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold">Binary Network Tree</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Your binary placement structure</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBinaryTree} className="w-full sm:w-auto">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3 sm:mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 text-sm"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-accent/30 rounded-lg max-h-40 sm:max-h-48 overflow-y-auto">
          <p className="text-xs sm:text-sm font-medium mb-2">Found {searchResults.length} member(s):</p>
          <div className="space-y-1.5 sm:space-y-2">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 bg-background rounded-lg cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  expandPathToNode(result);
                  setSearchQuery("");
                }}
              >
                <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                  {result.avatar_url && <AvatarImage src={result.avatar_url} />}
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px] sm:text-xs">
                    {getInitials(result.full_name, result.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate">
                    {result.full_name || result.email.split("@")[0]}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{result.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                  {result.placement_leg === "left" ? "L" : result.placement_leg === "right" ? "R" : "Root"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        <div className="p-2 sm:p-3 bg-blue-500/10 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5 sm:mb-1">
            <ArrowDownLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium">Left</span>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-500">{stats.totalLeft}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">members</p>
        </div>
        <div className="p-2 sm:p-3 bg-green-500/10 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-green-500 mb-0.5 sm:mb-1">
            <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium">Right</span>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-500">{stats.totalRight}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">members</p>
        </div>
        <div className="p-2 sm:p-3 bg-purple-500/10 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-purple-500 mb-0.5 sm:mb-1">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium">Total</span>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-500">{stats.totalLeft + stats.totalRight}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">members</p>
        </div>
        <div className="p-2 sm:p-3 bg-amber-500/10 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5 sm:mb-1">
            <GitBranch className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium">Cycles</span>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-amber-500">{treeData?.total_cycles || 0}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">completed</p>
        </div>
      </div>

      {/* Zoom and Scroll Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 0.5} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs sm:text-sm text-muted-foreground min-w-[45px] sm:min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 1.5} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomReset} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={scrollToTop} className="h-8 px-2 sm:px-3 text-xs sm:text-sm">
            <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            Top
          </Button>
          <Button variant="outline" size="sm" onClick={scrollToBottom} className="h-8 px-2 sm:px-3 text-xs sm:text-sm">
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            Bottom
          </Button>
        </div>
      </div>

      {/* Tree View with ScrollArea */}
      <ScrollArea ref={scrollAreaRef} className="h-[300px] sm:h-[400px] md:h-[500px] border rounded-lg">
        <div 
          ref={treeContainerRef}
          className="overflow-x-auto p-2 sm:p-4"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <div className="flex justify-center min-w-max py-2 sm:py-4">
            {treeData ? (
              renderNode(treeData, true)
            ) : (
              <div className="text-center py-8 sm:py-12 text-muted-foreground px-4">
                <GitBranch className="w-10 h-10 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-base sm:text-lg font-medium">No Binary Position</p>
                <p className="text-xs sm:text-sm">You haven't been placed in the binary network yet.</p>
                <p className="text-xs sm:text-sm mt-2">Purchase an AI package to get started!</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-accent/30 rounded-lg">
        <h4 className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-sm">How it works:</h4>
        <ul className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5 sm:space-y-1">
          <li>• Click on any node with children to expand/collapse</li>
          <li>• Use search to find members quickly</li>
          <li>• <span className="text-blue-500">Blue (Left)</span> - First placement</li>
          <li>• <span className="text-green-500">Green (Right)</span> - Second placement</li>
          <li>• 3rd+ referrals: Choose which leg (spillover)</li>
        </ul>
      </div>
    </Card>
  );
}
