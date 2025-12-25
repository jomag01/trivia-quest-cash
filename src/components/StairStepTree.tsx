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
  Award,
  Search,
  X,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [stairStepConfig, setStairStepConfig] = useState<StairStepConfig[]>([]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

    // Get stair-step rank
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

    // Only fetch children if we haven't reached max depth (7 levels)
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

  const getStepColor = (step: number): string => {
    const colors = [
      "#94a3b8", // Step 0 - Gray
      "#f59e0b", // Step 1 - Bronze
      "#6b7280", // Step 2 - Silver  
      "#eab308", // Step 3 - Gold
      "#ef4444", // Step 4 - Ruby
      "#3b82f6", // Step 5 - Sapphire
      "#22c55e", // Step 6 - Emerald
      "#8b5cf6", // Step 7 - Diamond
    ];
    return colors[Math.min(step, colors.length - 1)];
  };

  const renderTree = (node: StairStepNode, x: number, y: number, level: number): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const nodeWidth = isMobile ? 140 : 180;
    const nodeHeight = isMobile ? 90 : 110;
    const verticalSpacing = isMobile ? 110 : 150;
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
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
      );

      elements.push(...renderTree(child, childX, childY, level + 1));
    });

    const isSelected = selectedNode?.id === node.id;
    const isHighlighted = highlightedNodes.has(node.id);
    const stepColor = getStepColor(node.current_step);

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
          fill={isSelected ? stepColor : isHighlighted ? "#fbbf24" : "hsl(var(--card))"}
          stroke={isHighlighted ? "#f59e0b" : stepColor}
          strokeWidth={isSelected || isHighlighted ? "3" : "2"}
        />
        
        {/* Step Badge */}
        <rect
          x={5}
          y={5}
          width={nodeWidth - 10}
          height={22}
          rx="4"
          fill={stepColor}
        />
        <text
          x={nodeWidth / 2}
          y={19}
          textAnchor="middle"
          fontSize="11"
          fill="white"
          fontWeight="600"
        >
          {node.step_name || `Step ${node.current_step}`} ({node.commission_rate}%)
        </text>

        {/* User Icon */}
        <circle
          cx={nodeWidth / 2}
          cy={45}
          r="12"
          fill={stepColor}
          opacity="0.2"
        />
        <text
          x={nodeWidth / 2}
          y={50}
          textAnchor="middle"
          fontSize="14"
          fill={isSelected ? "white" : "hsl(var(--foreground))"}
        >
          👤
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

        {/* Level */}
        <text
          x={nodeWidth / 2}
          y={isMobile ? 85 : 90}
          textAnchor="middle"
          fontSize={isMobile ? "9" : "10"}
          fill={isSelected ? "white" : "hsl(var(--muted-foreground))"}
        >
          Level {level} • {node.children.length} downlines
        </text>
      </g>
    );

    return elements;
  };

  const countTotalMembers = (node: StairStepNode): number => {
    return 1 + node.children.reduce((sum, child) => sum + countTotalMembers(child), 0);
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

  if (!treeData) {
    return (
      <Card className="p-6 text-center">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No stair-step data available</p>
      </Card>
    );
  }

  const totalMembers = countTotalMembers(treeData);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <h3 className="text-base md:text-lg font-semibold">Stair-Step Network Tree</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {totalMembers} members • View commission levels
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
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
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
        <div className="flex flex-wrap gap-2">
          {stairStepConfig.map((step) => (
            <Badge
              key={step.step_number}
              style={{ backgroundColor: getStepColor(step.step_number), color: 'white' }}
            >
              {step.step_name} ({step.commission_percentage}%)
            </Badge>
          ))}
        </div>
      </Card>

      {/* Tree Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-2 md:p-4 overflow-hidden">
          <div
            className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-gradient-to-br from-background to-muted/20 rounded-lg border"
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
              <g transform="translate(600, 80)">
                {renderTree(treeData, 0, 0, 1)}
              </g>
            </svg>
          </div>
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
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl"
                  style={{ backgroundColor: getStepColor(selectedNode.current_step) }}
                >
                  👤
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
                  <span className="text-sm text-muted-foreground">Rank</span>
                  <Badge style={{ backgroundColor: getStepColor(selectedNode.current_step), color: 'white' }}>
                    {selectedNode.step_name}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground">Commission Rate</span>
                  <span className="font-semibold">{selectedNode.commission_rate}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground">Network Level</span>
                  <span className="font-semibold">Level {selectedNode.level}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground">Direct Downlines</span>
                  <span className="font-semibold">{selectedNode.children.length}</span>
                </div>
              </div>
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

export default StairStepTree;
