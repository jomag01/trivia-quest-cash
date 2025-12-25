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
  Crown,
  Search,
  X,
  RefreshCw,
  Award
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface LeadershipNode {
  id: string;
  full_name: string | null;
  email: string | null;
  referral_code: string;
  is_manager: boolean;
  current_step: number;
  created_at: string;
  level: number;
  line_number: number; // 1 for first line, 2 for second line
  children: LeadershipNode[];
}

interface LeadershipTreeProps {
  userId: string;
}

export const LeadershipTree = ({ userId }: LeadershipTreeProps) => {
  const [lineOneTtree, setLineOneTree] = useState<LeadershipNode | null>(null);
  const [lineTwoTree, setLineTwoTree] = useState<LeadershipNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<LeadershipNode | null>(null);
  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [maxStep, setMaxStep] = useState(0);
  const [activeLineTab, setActiveLineTab] = useState<'line1' | 'line2'>('line1');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [managerStats, setManagerStats] = useState({ line1Managers: 0, line2Managers: 0 });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchMaxStep();
      fetchUserProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && maxStep > 0) {
      fetchLeadershipTree();
    }
  }, [userId, maxStep]);

  const fetchUserProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setUserProfile(data);
  };

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
      
      // Get direct referrals (these define the lines)
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

      // Build tree for first line
      if (directReferrals[0]) {
        const line1 = await buildTree(directReferrals[0].id, 1, 1);
        setLineOneTree(line1);
        line1Managers = countManagers(line1);
      }

      // Build tree for second line
      if (directReferrals[1]) {
        const line2 = await buildTree(directReferrals[1].id, 1, 2);
        setLineTwoTree(line2);
        line2Managers = countManagers(line2);
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

    // Get stair-step rank
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

    // Only fetch children if we haven't reached max depth (7 manager levels - dynamic compression)
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
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

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
    
    const matches1 = searchNodes(lineOneTtree, searchQuery);
    const matches2 = searchNodes(lineTwoTree, searchQuery);
    const allMatches = new Set([...matches1, ...matches2]);
    setHighlightedNodes(allMatches);
    
    if (allMatches.size > 0) {
      toast.success(`Found ${allMatches.size} matching member${allMatches.size !== 1 ? 's' : ''}`);
    }
  }, [searchQuery, lineOneTtree, lineTwoTree]);

  const renderTree = (node: LeadershipNode, x: number, y: number, level: number): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const nodeWidth = isMobile ? 140 : 180;
    const nodeHeight = isMobile ? 85 : 100;
    const verticalSpacing = isMobile ? 100 : 140;
    const horizontalSpacing = isMobile ? 160 : 200;

    const childCount = node.children.length;
    const totalWidth = childCount * horizontalSpacing;
    const startX = x - totalWidth / 2 + horizontalSpacing / 2;

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
          stroke={child.is_manager ? "#eab308" : "hsl(var(--border))"}
          strokeWidth={child.is_manager ? "3" : "2"}
        />
      );

      elements.push(...renderTree(child, childX, childY, level + 1));
    });

    const isSelected = selectedNode?.id === node.id;
    const isHighlighted = highlightedNodes.has(node.id);
    const nodeColor = node.is_manager ? "#eab308" : "hsl(var(--muted-foreground))";

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
          fill={isSelected ? nodeColor : isHighlighted ? "#fbbf24" : "hsl(var(--card))"}
          stroke={isHighlighted ? "#f59e0b" : nodeColor}
          strokeWidth={isSelected || isHighlighted || node.is_manager ? "3" : "2"}
        />
        
        {/* Manager Crown or Level Badge */}
        {node.is_manager ? (
          <g>
            <rect x={5} y={5} width={nodeWidth - 10} height={22} rx="4" fill="#eab308" />
            <text x={nodeWidth / 2} y={19} textAnchor="middle" fontSize="11" fill="white" fontWeight="600">
              👑 Manager Level
            </text>
          </g>
        ) : (
          <g>
            <rect x={5} y={5} width={45} height={18} rx="4" fill="hsl(var(--muted))" />
            <text x={27} y={17} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))" fontWeight="500">
              Step {node.current_step}
            </text>
          </g>
        )}

        {/* User Icon */}
        <circle cx={nodeWidth / 2} cy={45} r="12" fill={nodeColor} opacity="0.2" />
        <text x={nodeWidth / 2} y={50} textAnchor="middle" fontSize="14" fill={isSelected ? "white" : "hsl(var(--foreground))"}>
          {node.is_manager ? "👑" : "👤"}
        </text>

        {/* Name */}
        <text
          x={nodeWidth / 2}
          y={70}
          textAnchor="middle"
          fontSize={isMobile ? "10" : "12"}
          fill={isSelected ? "white" : "hsl(var(--foreground))"}
          fontWeight="500"
        >
          {node.full_name || node.email?.split("@")[0] || "Anonymous"}
        </text>

        {/* Level & Downlines */}
        <text
          x={nodeWidth / 2}
          y={isMobile ? 82 : 88}
          textAnchor="middle"
          fontSize={isMobile ? "9" : "10"}
          fill={isSelected ? "white" : "hsl(var(--muted-foreground))"}
        >
          Level {level} • {node.children.length} refs
        </text>
      </g>
    );

    return elements;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </Card>
    );
  }

  if (!lineOneTtree && !lineTwoTree) {
    return (
      <Card className="p-6 text-center">
        <Crown className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No leadership network data available</p>
        <p className="text-sm text-muted-foreground mt-2">Build your referral lines to see managers here</p>
      </Card>
    );
  }

  const currentTree = activeLineTab === 'line1' ? lineOneTtree : lineTwoTree;

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card className={`p-4 cursor-pointer transition-all ${activeLineTab === 'line1' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveLineTab('line1')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Line 1 Managers</p>
              <p className="text-2xl font-bold text-blue-500">{managerStats.line1Managers}</p>
            </div>
          </div>
          {managerStats.line1Managers > 0 && (
            <Badge className="mt-2 bg-blue-500/10 text-blue-500">✓ Has Managers</Badge>
          )}
        </Card>

        <Card className={`p-4 cursor-pointer transition-all ${activeLineTab === 'line2' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveLineTab('line2')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Line 2 Managers</p>
              <p className="text-2xl font-bold text-purple-500">{managerStats.line2Managers}</p>
            </div>
          </div>
          {managerStats.line2Managers > 0 && (
            <Badge className="mt-2 bg-purple-500/10 text-purple-500">✓ Has Managers</Badge>
          )}
        </Card>
      </div>

      {/* 2-Line Requirement Status */}
      <Card className={`p-4 ${managerStats.line1Managers > 0 && managerStats.line2Managers > 0 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-amber-500/10 border-amber-500/30'}`}>
        <div className="flex items-center gap-3">
          <Award className={`w-6 h-6 ${managerStats.line1Managers > 0 && managerStats.line2Managers > 0 
            ? 'text-green-500' : 'text-amber-500'}`} />
          <div>
            <p className="font-semibold">
              {managerStats.line1Managers > 0 && managerStats.line2Managers > 0 
                ? '✅ 2-Line Requirement Met!' 
                : '⏳ 2-Line Requirement Pending'}
            </p>
            <p className="text-sm text-muted-foreground">
              {managerStats.line1Managers > 0 && managerStats.line2Managers > 0 
                ? 'You qualify for the 2% leadership bonus from your Manager downlines' 
                : 'Build managers in both lines to earn 2% leadership bonus'}
            </p>
          </div>
        </div>
      </Card>

      {/* Header Controls */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div>
              <h3 className="text-base md:text-lg font-semibold">
                Leadership Tree - {activeLineTab === 'line1' ? 'Line 1' : 'Line 2'}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                View managers in your {activeLineTab === 'line1' ? 'first' : 'second'} referral line
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <div className="relative w-full md:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
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

      {/* Legend */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-3">
          <Badge className="bg-yellow-500 text-white">👑 Manager Level (21%)</Badge>
          <Badge variant="outline">Regular Affiliate</Badge>
        </div>
      </Card>

      {/* Tree Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-2 md:p-4 overflow-hidden">
          {currentTree ? (
            <div
              className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-gradient-to-br from-background to-muted/20 rounded-lg border"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
            >
              <svg
                className="w-full h-full"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center",
                  transition: isDragging ? "none" : "transform 0.3s ease-out",
                }}
              >
                <g transform="translate(600, 80)">
                  {renderTree(currentTree, 0, 0, 1)}
                </g>
              </svg>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No members in {activeLineTab === 'line1' ? 'Line 1' : 'Line 2'} yet</p>
              </div>
            </div>
          )}
        </Card>

        {/* Selected Node Details */}
        <Card className="p-4">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Member Details
          </h4>
          
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${
                    selectedNode.is_manager ? 'bg-yellow-500' : 'bg-muted'
                  }`}
                >
                  {selectedNode.is_manager ? "👑" : "👤"}
                </div>
                <div>
                  <p className="font-semibold">
                    {selectedNode.full_name || selectedNode.email?.split("@")[0]}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedNode.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {selectedNode.is_manager ? (
                    <Badge className="bg-yellow-500">Manager Level</Badge>
                  ) : (
                    <Badge variant="outline">Step {selectedNode.current_step}</Badge>
                  )}
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground">Line</span>
                  <Badge variant={selectedNode.line_number === 1 ? "default" : "secondary"}>
                    Line {selectedNode.line_number}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground">Network Level</span>
                  <span className="font-semibold">Level {selectedNode.level}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground">Direct Referrals</span>
                  <span className="font-semibold">{selectedNode.children.length}</span>
                </div>
              </div>

              {selectedNode.is_manager && (
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <p className="text-sm">
                    <Crown className="w-4 h-4 inline mr-1 text-yellow-500" />
                    This affiliate earns 2% leadership bonus from their manager downlines
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Click on a member to view details</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LeadershipTree;
