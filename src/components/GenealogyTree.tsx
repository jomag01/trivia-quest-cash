import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Users, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  User, 
  DollarSign,
  Calendar,
  Award,
  Search,
  X,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currencies";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [zoom, setZoom] = useState(0.6); // Start more zoomed out for mobile
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    } catch (error: any) {
      console.error("Error fetching network tree:", error);
      toast.error("Failed to load network tree");
    } finally {
      setLoading(false);
    }
  };

  const buildTree = async (nodeId: string, level: number): Promise<TreeNode> => {
    // Fetch current node data
    const { data: nodeData, error: nodeError } = await supabase
      .from("profiles")
      .select("id, full_name, email, referral_code, credits, created_at, is_verified, referred_by")
      .eq("id", nodeId)
      .single();

    if (nodeError) throw nodeError;

    // Fetch referrer info if exists
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

    // Only fetch children if we haven't reached max depth (7 levels)
    if (level < 7) {
      const { data: children, error: childError } = await supabase
        .from("profiles")
        .select("id")
        .eq("referred_by", nodeId);

      if (childError) throw childError;

      if (children && children.length > 0) {
        // Recursively build child nodes
        node.children = await Promise.all(
          children.map((child) => buildTree(child.id, level + 1))
        );
      }
    }

    return node;
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

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
    } else {
      toast.info("No members found matching your search");
    }
  }, [searchQuery, treeData]);

  const renderTree = (node: TreeNode, x: number, y: number, level: number): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const nodeWidth = isMobile ? 140 : 180;
    const nodeHeight = isMobile ? 80 : 100;
    const verticalSpacing = isMobile ? 100 : 140;
    const horizontalSpacing = isMobile ? 160 : 200;

    // Calculate positions for children
    const childCount = node.children.length;
    const totalWidth = childCount * horizontalSpacing;
    const startX = x - totalWidth / 2 + horizontalSpacing / 2;

    // Draw lines to children
    node.children.forEach((child, index) => {
      const childX = startX + index * horizontalSpacing;
      const childY = y + verticalSpacing;

      elements.push(
        <line
          key={`line-${node.id}-${child.id}`}
          x1={x}
          y1={y + nodeHeight / 2}
          x2={childX}
          y2={childY - nodeHeight / 2}
          stroke="hsl(var(--border))"
          strokeWidth="2"
          className="transition-all duration-300"
        />
      );

      elements.push(...renderTree(child, childX, childY, level + 1));
    });

    // Draw the node
    const isSelected = selectedNode?.id === node.id;
    const isHighlighted = highlightedNodes.has(node.id);
    const levelColors = [
      "hsl(var(--primary))",
      "hsl(var(--secondary))",
      "hsl(var(--accent))",
      "#FF6B6B",
      "#4ECDC4",
      "#95E1D3",
      "#F38181",
    ];

    elements.push(
      <g
        key={`node-${node.id}`}
        transform={`translate(${x - nodeWidth / 2}, ${y - nodeHeight / 2})`}
        className="cursor-pointer transition-all duration-300 hover:scale-105"
        onClick={() => setSelectedNode(node)}
      >
        <rect
          width={nodeWidth}
          height={nodeHeight}
          rx="8"
          fill={isSelected ? levelColors[level - 1] : isHighlighted ? "#fbbf24" : "hsl(var(--card))"}
          stroke={isHighlighted ? "#f59e0b" : levelColors[level - 1]}
          strokeWidth={isSelected || isHighlighted ? "3" : "2"}
          className="transition-all duration-300"
        />
        
        {/* User Icon */}
        <circle
          cx={nodeWidth / 2}
          cy={25}
          r="15"
          fill={levelColors[level - 1]}
          opacity="0.2"
        />
        <text
          x={nodeWidth / 2}
          y={30}
          textAnchor="middle"
          fontSize="16"
          fill={isSelected ? "white" : "hsl(var(--foreground))"}
          fontWeight="600"
        >
          👤
        </text>

        {/* Name */}
        <text
          x={nodeWidth / 2}
          y={55}
          textAnchor="middle"
          fontSize={isMobile ? "10" : "12"}
          fill={isSelected ? "white" : "hsl(var(--foreground))"}
          fontWeight="500"
          className="truncate"
        >
          {node.full_name || node.email?.split("@")[0] || "Anonymous"}
        </text>

        {/* Level Badge */}
        <rect
          x={5}
          y={5}
          width={35}
          height={18}
          rx="4"
          fill={levelColors[level - 1]}
        />
        <text
          x={22.5}
          y={17}
          textAnchor="middle"
          fontSize="10"
          fill="white"
          fontWeight="600"
        >
          L{level}
        </text>

        {/* Verified Badge */}
        {node.is_verified && (
          <g transform={`translate(${nodeWidth - 25}, 5)`}>
            <circle cx="10" cy="9" r="9" fill="#10B981" />
            <text x="10" y="13" textAnchor="middle" fontSize="10" fill="white">
              ✓
            </text>
          </g>
        )}

        {/* Credits */}
        <text
          x={nodeWidth / 2}
          y={isMobile ? 70 : 75}
          textAnchor="middle"
          fontSize={isMobile ? "9" : "11"}
          fill={isSelected ? "white" : "hsl(var(--muted-foreground))"}
        >
          ₱{node.credits}
        </text>

        {/* Children Count */}
        {node.children.length > 0 && (
          <g transform={`translate(${nodeWidth / 2 - 15}, ${nodeHeight - 25})`}>
            <rect width="30" height="18" rx="4" fill={levelColors[level - 1]} opacity="0.2" />
            <text
              x="15"
              y="13"
              textAnchor="middle"
              fontSize="10"
              fill={isSelected ? "white" : "hsl(var(--foreground))"}
              fontWeight="500"
            >
              {node.children.length} 👥
            </text>
          </g>
        )}
      </g>
    );

    return elements;
  };

  const countTotalMembers = (node: TreeNode): number => {
    return 1 + node.children.reduce((sum, child) => sum + countTotalMembers(child), 0);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </Card>
    );
  }

  if (!treeData) {
    return (
      <Card className="p-6 text-center">
        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No network data available</p>
      </Card>
    );
  }

  const totalMembers = countTotalMembers(treeData);

  return (
    <div className="space-y-4">
      {/* Referrer/Upline Info Card */}
      {treeData?.referrer && (
        <Card className="p-3 md:p-4 bg-primary/5 border-primary/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground mb-1">Your Referrer / Upline</p>
              <p className="font-semibold text-base md:text-lg truncate">
                {treeData.referrer.full_name || treeData.referrer.email?.split('@')[0] || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{treeData.referrer.email}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <Badge variant="outline" className="border-primary">
                <User className="w-3 h-3 mr-1" />
                Upline
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Header Controls */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <h3 className="text-base md:text-lg font-semibold">
                Network Genealogy Tree
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {totalMembers} total members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* Search Box */}
            <div className="relative w-full md:w-48 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isMobile ? "Search..." : "Search by name or email..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm"
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

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs md:text-sm font-medium min-w-[50px] md:min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 w-8 p-0">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tree Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-2 md:p-4 overflow-hidden">
          <div
            className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden bg-gradient-to-br from-background to-muted/20 rounded-lg border"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
              <svg
                ref={svgRef}
                className="w-full h-full"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center",
                  transition: isDragging ? "none" : "transform 0.3s ease-out",
                }}
              >
                <g transform={`translate(${isMobile ? 200 : 400}, ${isMobile ? 60 : 80})`}>
                  {treeData && renderTree(treeData, 0, 0, 1)}
                </g>
              </svg>

            {/* Instructions */}
            <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-card/90 backdrop-blur-sm px-2 py-1.5 md:px-3 md:py-2 rounded-lg border text-xs text-muted-foreground max-w-[calc(100%-1rem)]">
              {isMobile ? "💡 Tap node • Drag • Zoom" : "💡 Click nodes for details • Drag to pan • Use controls to zoom"}
            </div>
          </div>
        </Card>

        {/* Member Details Panel */}
        <Card className="p-3 md:p-4">
          {selectedNode ? (
            <div className="space-y-3 md:space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm md:text-base">
                  <User className="w-4 h-4 text-primary" />
                  Member Details
                </h4>
                <Badge variant="outline" className="text-xs">Level {selectedNode.level}</Badge>
              </div>

              <div className="space-y-2 md:space-y-3">
                <div className="p-2 md:p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium truncate">
                    {selectedNode.full_name || "Anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedNode.email}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-1 md:gap-2 text-xs text-muted-foreground mb-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="text-[10px] md:text-xs">Credits</span>
                    </div>
                    <p className="text-base md:text-lg font-bold text-primary truncate">
                      ₱{selectedNode.credits}
                    </p>
                  </div>

                  <div className="p-2 md:p-3 bg-secondary/10 rounded-lg">
                    <div className="flex items-center gap-1 md:gap-2 text-xs text-muted-foreground mb-1">
                      <Users className="w-3 h-3" />
                      <span className="text-[10px] md:text-xs">Referrals</span>
                    </div>
                    <p className="text-base md:text-lg font-bold text-secondary">
                      {selectedNode.children.length}
                    </p>
                  </div>
                </div>

                <div className="p-2 md:p-3 bg-muted/50 rounded-lg space-y-2">
                  {selectedNode.referrer && (
                    <div className="flex items-center justify-between text-sm pb-2 border-b">
                      <span className="text-muted-foreground">Referred By</span>
                      <span className="font-medium text-primary">
                        {selectedNode.referrer.full_name || selectedNode.referrer.email?.split('@')[0]}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Referral Code</span>
                    <code className="font-mono font-semibold">
                      {selectedNode.referral_code}
                    </code>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Joined
                    </span>
                    <span className="font-medium">
                      {new Date(selectedNode.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Status
                    </span>
                    <Badge variant={selectedNode.is_verified ? "default" : "secondary"}>
                      {selectedNode.is_verified ? "✓ Verified" : "Unverified"}
                    </Badge>
                  </div>
                </div>

                {selectedNode.children.length > 0 && (
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Direct Referrals ({selectedNode.children.length})
                    </h5>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {selectedNode.children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between text-xs p-2 bg-background rounded cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setSelectedNode(child)}
                        >
                          <span className="font-medium truncate">
                            {child.full_name || child.email?.split("@")[0]}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            L{child.level}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                Click on any node in the tree to view member details
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
