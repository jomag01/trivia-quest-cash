import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  Menu, 
  ChevronDown, 
  ChevronRight,
  LayoutDashboard,
  Network,
  Calculator,
  Crown,
  Bell,
  Gem,
  Trophy,
  ShoppingCart,
  Heart,
  Package,
  TrendingUp,
  GitBranch,
  Megaphone,
  Share2,
  HeadphonesIcon,
  Wallet,
  Brain,
  MessageSquare,
  Sparkles,
  Truck,
  Building2,
  Settings,
  LogOut,
  Users,
  type LucideIcon
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color?: string;
  children?: NavItem[];
  requiresBinary?: boolean; // Items that require binary enrollment
}

interface DashboardNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  isBinaryEnrolled?: boolean; // Whether user is enrolled in binary network
  hiddenTabs?: string[]; // Admin-controlled hidden tabs
}

const navItems: NavItem[] = [
  { 
    id: "overview", 
    label: "Overview", 
    icon: LayoutDashboard,
    color: "text-blue-500"
  },
  {
    id: "affiliate",
    label: "Affiliate Tree",
    icon: Network,
    color: "text-emerald-500",
    children: [
      { id: "network", label: "Genealogy Tree", icon: Users, color: "text-emerald-400" },
      { id: "leadership", label: "Leadership Tree", icon: Crown, color: "text-amber-500" },
      { id: "stair-step", label: "Stair Step Tree", icon: TrendingUp, color: "text-purple-500" },
    ]
  },
  {
    id: "binary",
    label: "Binary Network",
    icon: GitBranch,
    color: "text-cyan-500",
    requiresBinary: true, // Only show when user is in binary network
    children: [
      { id: "binary-earnings", label: "Binary Earnings", icon: TrendingUp, color: "text-cyan-400", requiresBinary: true },
    ]
  },
  { 
    id: "calculator", 
    label: "Calculator", 
    icon: Calculator,
    color: "text-orange-500"
  },
  {
    id: "engagement",
    label: "Engagement",
    icon: Bell,
    color: "text-pink-500",
    children: [
      { id: "notifications", label: "Notifications", icon: Bell, color: "text-pink-400" },
      { id: "support", label: "Support Chat", icon: HeadphonesIcon, color: "text-indigo-500" },
    ]
  },
  {
    id: "rewards",
    label: "Rewards",
    icon: Gem,
    color: "text-violet-500",
    children: [
      { id: "diamonds", label: "Diamonds", icon: Gem, color: "text-violet-400" },
      { id: "leaderboard", label: "Leaderboard", icon: Trophy, color: "text-amber-500" },
    ]
  },
  {
    id: "shopping",
    label: "Shopping",
    icon: ShoppingCart,
    color: "text-rose-500",
    children: [
      { id: "cart", label: "Cart", icon: ShoppingCart, color: "text-rose-400" },
      { id: "wishlist", label: "Wishlist", icon: Heart, color: "text-red-500" },
      { id: "orders", label: "Orders", icon: Package, color: "text-teal-500" },
    ]
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    color: "text-yellow-500",
    children: [
      { id: "advertising", label: "Advertising", icon: Megaphone, color: "text-yellow-400" },
      { id: "promo-ads", label: "Promo Content", icon: Share2, color: "text-green-500" },
    ]
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
    color: "text-lime-500",
    children: [
      { id: "transactions", label: "Transactions", icon: Wallet, color: "text-lime-400" },
    ]
  },
  {
    id: "ai-tools",
    label: "AI Tools",
    icon: Brain,
    color: "text-fuchsia-500",
    children: [
      { id: "ai-research", label: "AI Research", icon: Brain, color: "text-fuchsia-400" },
      { id: "ai-chat", label: "GPT-5 Chat", icon: MessageSquare, color: "text-blue-400" },
      { id: "ai-credits", label: "AI Credits", icon: Sparkles, color: "text-amber-400" },
    ]
  },
  {
    id: "business",
    label: "Business",
    icon: Building2,
    color: "text-slate-500",
    children: [
      { id: "supplier-products", label: "Supplier Products", icon: Truck, color: "text-slate-400" },
      { id: "my-listings", label: "My Listings", icon: Building2, color: "text-stone-500" },
    ]
  },
  { 
    id: "account-settings", 
    label: "Account Settings", 
    icon: Settings,
    color: "text-gray-500"
  },
];

// Map dashboard tab IDs to hidden tab IDs
const mapToHiddenTabId = (tabId: string): string => {
  return `dashboard-${tabId}`;
};

// Filter nav items based on binary enrollment and hidden tabs
const filterNavItems = (items: NavItem[], isBinaryEnrolled: boolean, hiddenTabs: string[] = []): NavItem[] => {
  return items
    .filter(item => {
      const hiddenId = mapToHiddenTabId(item.id);
      const isHidden = hiddenTabs.includes(hiddenId);
      const requiresBinaryButNotEnrolled = item.requiresBinary && !isBinaryEnrolled;
      return !isHidden && !requiresBinaryButNotEnrolled;
    })
    .map(item => ({
      ...item,
      children: item.children?.filter(child => {
        const hiddenId = mapToHiddenTabId(child.id);
        const isHidden = hiddenTabs.includes(hiddenId);
        const requiresBinaryButNotEnrolled = child.requiresBinary && !isBinaryEnrolled;
        return !isHidden && !requiresBinaryButNotEnrolled;
      })
    }))
    .filter(item => !item.children || item.children.length > 0); // Remove empty parent groups
};

// Helper to find which parent group an item belongs to
const findParentGroup = (tabId: string, items: NavItem[]): string | null => {
  for (const item of items) {
    if (item.children?.some(child => child.id === tabId)) {
      return item.id;
    }
  }
  return null;
};

// Helper to get current tab label
const getTabLabel = (tabId: string, items: NavItem[]): string => {
  for (const item of items) {
    if (item.id === tabId) return item.label;
    if (item.children) {
      const child = item.children.find(c => c.id === tabId);
      if (child) return child.label;
    }
  }
  return tabId.replace('-', ' ');
};

export function DashboardNavigation({ activeTab, onTabChange, onSignOut, isBinaryEnrolled = false, hiddenTabs = [] }: DashboardNavigationProps) {
  // Filter nav items based on binary enrollment and hidden tabs
  const filteredNavItems = useMemo(
    () => filterNavItems(navItems, isBinaryEnrolled, hiddenTabs), 
    [isBinaryEnrolled, hiddenTabs]
  );
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const parent = findParentGroup(activeTab, filteredNavItems);
    return parent ? new Set([parent]) : new Set();
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleItemClick = (itemId: string, hasChildren: boolean) => {
    if (hasChildren) {
      toggleGroup(itemId);
    } else {
      onTabChange(itemId);
      setMobileMenuOpen(false);
    }
  };

  const isItemActive = (item: NavItem): boolean => {
    if (item.id === activeTab) return true;
    if (item.children?.some(child => child.id === activeTab)) return true;
    return false;
  };

  const NavItemComponent = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.has(item.id);
    const isActive = isItemActive(item);
    const isDirectlyActive = item.id === activeTab;
    const Icon = item.icon;

    if (hasChildren) {
      return (
        <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(item.id)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between gap-2 h-9 px-3 text-sm font-medium transition-all duration-200",
                isActive && "bg-accent/50 text-accent-foreground",
                !isActive && "hover:bg-muted/80",
                depth > 0 && "pl-8"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1 rounded-md transition-colors",
                  isActive ? "bg-accent/20" : "bg-muted"
                )}>
                  <Icon className={cn("w-4 h-4", item.color)} />
                </div>
                <span>{item.label}</span>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-0.5 mt-0.5">
            {item.children?.map((child) => (
              <NavItemComponent key={child.id} item={child} depth={depth + 1} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Button
        variant={isDirectlyActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-2 h-9 px-3 text-sm font-medium transition-all duration-200",
          isDirectlyActive && "bg-accent text-accent-foreground shadow-sm",
          !isDirectlyActive && "hover:bg-muted/80",
          depth > 0 && "pl-8"
        )}
        onClick={() => handleItemClick(item.id, false)}
      >
        <div className={cn(
          "p-1 rounded-md transition-colors",
          isDirectlyActive ? "bg-background/20" : "bg-muted"
        )}>
          <Icon className={cn("w-4 h-4", isDirectlyActive ? "text-accent-foreground" : item.color)} />
        </div>
        <span>{item.label}</span>
      </Button>
    );
  };

  return (
    <>
      {/* Mobile/Tablet Navigation */}
      <div className="lg:hidden mb-4">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between gap-2 h-11 bg-gradient-to-r from-accent/5 to-primary/5 border-accent/20 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Menu className="w-5 h-5 text-accent" />
                <span className="font-medium capitalize">{getTabLabel(activeTab, filteredNavItems)}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-72 p-0 bg-gradient-to-b from-background to-muted/20 border-accent/20"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-border/50 bg-gradient-to-r from-accent/10 to-primary/10">
                <h2 className="font-bold text-lg bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  Dashboard Menu
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Navigate your dashboard</p>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {filteredNavItems.map((item) => (
                  <NavItemComponent key={item.id} item={item} />
                ))}
              </div>

              {/* Logout */}
              <div className="p-3 border-t border-border/50 bg-muted/30">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onSignOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className="p-1 rounded-md bg-destructive/10">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Navigation - Compact Dropdown */}
      <div className="hidden lg:block mb-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Button
              variant="outline"
              className="w-72 justify-between gap-2 h-11 bg-gradient-to-r from-accent/5 to-primary/5 border-accent/20 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-accent" />
                <span className="font-medium capitalize">{getTabLabel(activeTab, filteredNavItems)}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:rotate-180 transition-transform duration-200" />
            </Button>
            
            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-popover border border-border/50 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-2 space-y-0.5">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = item.children && item.children.length > 0;
                  const isActive = isItemActive(item);

                  if (hasChildren) {
                    return (
                      <div key={item.id} className="space-y-0.5">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg",
                          isActive ? "bg-accent/10 text-accent" : "text-muted-foreground"
                        )}>
                          <div className={cn("p-1 rounded-md", isActive ? "bg-accent/20" : "bg-muted")}>
                            <Icon className={cn("w-4 h-4", item.color)} />
                          </div>
                          <span>{item.label}</span>
                        </div>
                        <div className="pl-4 space-y-0.5">
                          {item.children?.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildActive = child.id === activeTab;
                            return (
                              <Button
                                key={child.id}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "w-full justify-start gap-2 h-8 px-3 text-sm",
                                  isChildActive && "bg-accent text-accent-foreground",
                                  !isChildActive && "hover:bg-muted"
                                )}
                                onClick={() => onTabChange(child.id)}
                              >
                                <ChildIcon className={cn("w-3.5 h-3.5", isChildActive ? "text-accent-foreground" : child.color)} />
                                <span>{child.label}</span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 h-9 px-3 text-sm",
                        item.id === activeTab && "bg-accent text-accent-foreground",
                        item.id !== activeTab && "hover:bg-muted"
                      )}
                      onClick={() => onTabChange(item.id)}
                    >
                      <div className={cn("p-1 rounded-md", item.id === activeTab ? "bg-background/20" : "bg-muted")}>
                        <Icon className={cn("w-4 h-4", item.id === activeTab ? "text-accent-foreground" : item.color)} />
                      </div>
                      <span>{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
