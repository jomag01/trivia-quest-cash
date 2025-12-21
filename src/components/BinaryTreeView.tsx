import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  GitBranch, 
  ChevronDown, 
  ChevronRight, 
  User, 
  ArrowDownLeft, 
  ArrowDownRight,
  RefreshCw,
  Users
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

  const fetchBinaryTree = useCallback(async () => {
    try {
      setLoading(true);
      const tree = await buildTree(userId, 1);
      setTreeData(tree);

      // Calculate stats
      if (tree) {
        const leftCount = countNodes(tree.left_child);
        const rightCount = countNodes(tree.right_child);
        setStats({
          totalLeft: leftCount,
          totalRight: rightCount,
          directLeft: tree.left_child ? 1 : 0,
          directRight: tree.right_child ? 1 : 0
        });
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

  const countNodes = (node: BinaryNode | null | undefined): number => {
    if (!node) return 0;
    return 1 + countNodes(node.left_child) + countNodes(node.right_child);
  };

  const buildTree = async (nodeUserId: string, level: number): Promise<BinaryNode | null> => {
    if (level > 7) return null; // Limit depth to 7 levels

    // Fetch binary network node
    const { data: networkData, error: networkError } = await supabase
      .from("binary_network")
      .select("*")
      .eq("user_id", nodeUserId)
      .maybeSingle();

    if (networkError) throw networkError;
    if (!networkData) return null;

    // Fetch profile data
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("id", nodeUserId)
      .maybeSingle();

    if (profileError) throw profileError;

    const node: BinaryNode = {
      id: networkData.id,
      user_id: nodeUserId,
      full_name: profileData?.full_name || null,
      email: profileData?.email || "",
      avatar_url: profileData?.avatar_url || null,
      left_volume: networkData.left_volume || 0,
      right_volume: networkData.right_volume || 0,
      total_cycles: networkData.total_cycles || 0,
      placement_leg: networkData.placement_leg,
      joined_at: networkData.joined_at || networkData.created_at,
      left_child: null,
      right_child: null
    };

    // Fetch children
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

  const renderNode = (node: BinaryNode, isRoot: boolean = false) => {
    const hasChildren = node.left_child || node.right_child;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div 
          className={`relative p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
            isRoot ? "bg-primary/10 border-primary" : "bg-card"
          } min-w-[200px]`}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {node.avatar_url && <AvatarImage src={node.avatar_url} />}
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {getInitials(node.full_name, node.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {node.full_name || node.email.split("@")[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">{node.email}</p>
            </div>
            {hasChildren && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Badge variant="outline" className="text-xs py-0">
              <ArrowDownLeft className="w-3 h-3 mr-1 text-blue-500" />
              ₱{node.left_volume.toLocaleString()}
            </Badge>
            <Badge variant="outline" className="text-xs py-0">
              <ArrowDownRight className="w-3 h-3 mr-1 text-green-500" />
              ₱{node.right_volume.toLocaleString()}
            </Badge>
          </div>
          
          <div className="mt-1 text-xs text-muted-foreground">
            Joined: {formatDate(node.joined_at)}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-4">
            {/* Connector Lines */}
            <div className="flex justify-center mb-2">
              <div className="w-px h-4 bg-border" />
            </div>
            <div className="flex gap-8 relative">
              {/* Horizontal connector */}
              {node.left_child && node.right_child && (
                <div className="absolute top-0 left-1/4 right-1/4 h-px bg-border" style={{ transform: "translateY(-8px)" }} />
              )}
              
              {/* Left Child */}
              <div className="flex flex-col items-center">
                {node.left_child && (
                  <>
                    <div className="flex items-center gap-1 mb-2 text-xs text-blue-500">
                      <ArrowDownLeft className="w-3 h-3" />
                      <span>Left</span>
                    </div>
                    {renderNode(node.left_child)}
                  </>
                )}
                {!node.left_child && (
                  <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground min-w-[150px]">
                    <User className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">Empty Left</p>
                  </div>
                )}
              </div>
              
              {/* Right Child */}
              <div className="flex flex-col items-center">
                {node.right_child && (
                  <>
                    <div className="flex items-center gap-1 mb-2 text-xs text-green-500">
                      <ArrowDownRight className="w-3 h-3" />
                      <span>Right</span>
                    </div>
                    {renderNode(node.right_child)}
                  </>
                )}
                {!node.right_child && (
                  <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground min-w-[150px]">
                    <User className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">Empty Right</p>
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
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex justify-center">
          <Skeleton className="h-32 w-64" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-bold">Binary Network Tree</h3>
            <p className="text-sm text-muted-foreground">Your binary placement structure</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBinaryTree}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-blue-500/10 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
            <ArrowDownLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Left Leg</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">{stats.totalLeft}</p>
          <p className="text-xs text-muted-foreground">total members</p>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
            <ArrowDownRight className="w-4 h-4" />
            <span className="text-sm font-medium">Right Leg</span>
          </div>
          <p className="text-2xl font-bold text-green-500">{stats.totalRight}</p>
          <p className="text-xs text-muted-foreground">total members</p>
        </div>
        <div className="p-3 bg-purple-500/10 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-purple-500">{stats.totalLeft + stats.totalRight}</p>
          <p className="text-xs text-muted-foreground">binary members</p>
        </div>
        <div className="p-3 bg-amber-500/10 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
            <GitBranch className="w-4 h-4" />
            <span className="text-sm font-medium">Cycles</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">{treeData?.total_cycles || 0}</p>
          <p className="text-xs text-muted-foreground">completed</p>
        </div>
      </div>

      {/* Tree View */}
      <div className="overflow-x-auto">
        <div className="flex justify-center min-w-max py-4">
          {treeData ? (
            renderNode(treeData, true)
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Binary Position</p>
              <p className="text-sm">You haven't been placed in the binary network yet.</p>
              <p className="text-sm mt-2">Purchase an AI package to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-accent/30 rounded-lg">
        <h4 className="font-medium mb-2 text-sm">How it works:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Click on any node with children to expand/collapse</li>
          <li>• <span className="text-blue-500">Blue</span> indicates left leg placement</li>
          <li>• <span className="text-green-500">Green</span> indicates right leg placement</li>
          <li>• Volumes show the total purchase amount in each leg</li>
        </ul>
      </div>
    </Card>
  );
}
