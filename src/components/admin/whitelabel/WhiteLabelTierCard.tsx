import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Edit, Trash2, Users, Package, HardDrive, Zap, Crown, Building2, Sparkles } from "lucide-react";

interface WhiteLabelTier {
  id: string;
  tier_name: string;
  tier_key: string;
  description: string;
  price_php: number;
  billing_cycle: string;
  included_systems: string[];
  max_users: number | null;
  max_products: number | null;
  max_storage_gb: number | null;
  custom_domain: boolean;
  custom_branding: boolean;
  api_access: boolean;
  priority_support: boolean;
  is_active: boolean;
}

interface Props {
  tier: WhiteLabelTier;
  systemOptions: { key: string; label: string }[];
  onEdit: (tier: WhiteLabelTier) => void;
  onDelete: (id: string) => void;
}

const tierGradients: Record<string, string> = {
  starter: "from-emerald-500 to-teal-600",
  professional: "from-amber-500 to-orange-600",
  enterprise: "from-purple-500 to-indigo-600",
};

const tierIcons: Record<string, JSX.Element> = {
  starter: <Zap className="h-5 w-5" />,
  professional: <Crown className="h-5 w-5" />,
  enterprise: <Building2 className="h-5 w-5" />,
};

export default function WhiteLabelTierCard({ tier, systemOptions, onEdit, onDelete }: Props) {
  const gradient = tierGradients[tier.tier_key] || "from-gray-500 to-gray-600";
  const icon = tierIcons[tier.tier_key] || <Sparkles className="h-5 w-5" />;

  return (
    <div className={`relative rounded-xl overflow-hidden border ${!tier.is_active ? 'opacity-60' : ''} bg-card shadow-md hover:shadow-lg transition-shadow`}>
      {/* Gradient Header */}
      <div className={`bg-gradient-to-r ${gradient} p-3 text-white`}>
        <div className="flex items-center justify-center gap-2">
          {icon}
          <h3 className="font-bold text-lg">{tier.tier_name}</h3>
        </div>
        <p className="text-center text-xs opacity-90 mt-0.5 line-clamp-1">{tier.description}</p>
      </div>

      {/* Price */}
      <div className="text-center py-3 border-b bg-muted/30">
        <span className="text-2xl font-bold">₱{tier.price_php.toLocaleString()}</span>
        <span className="text-muted-foreground text-sm">/{tier.billing_cycle}</span>
      </div>

      {/* Limits - Compact Grid */}
      <div className="grid grid-cols-3 gap-1 p-2 text-xs border-b">
        <div className="flex flex-col items-center p-1.5 rounded bg-blue-50 dark:bg-blue-950">
          <Users className="h-3.5 w-3.5 text-blue-600 mb-0.5" />
          <span className="font-semibold text-blue-700 dark:text-blue-300">{tier.max_users || '∞'}</span>
          <span className="text-muted-foreground text-[10px]">Users</span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded bg-green-50 dark:bg-green-950">
          <Package className="h-3.5 w-3.5 text-green-600 mb-0.5" />
          <span className="font-semibold text-green-700 dark:text-green-300">{tier.max_products || '∞'}</span>
          <span className="text-muted-foreground text-[10px]">Products</span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded bg-purple-50 dark:bg-purple-950">
          <HardDrive className="h-3.5 w-3.5 text-purple-600 mb-0.5" />
          <span className="font-semibold text-purple-700 dark:text-purple-300">{tier.max_storage_gb || '∞'}</span>
          <span className="text-muted-foreground text-[10px]">GB</span>
        </div>
      </div>

      {/* Included Systems */}
      <div className="p-2 border-b">
        <div className="flex flex-wrap gap-1">
          {tier.included_systems?.slice(0, 4).map((sys) => (
            <Badge key={sys} variant="secondary" className="text-[10px] px-1.5 py-0.5">
              {systemOptions.find(s => s.key === sys)?.label || sys}
            </Badge>
          ))}
          {(tier.included_systems?.length || 0) > 4 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
              +{tier.included_systems.length - 4}
            </Badge>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-1 p-2 text-[10px]">
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded ${tier.custom_domain ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
          {tier.custom_domain ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          <span>Custom Domain</span>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded ${tier.custom_branding ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
          {tier.custom_branding ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          <span>Branding</span>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded ${tier.api_access ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
          {tier.api_access ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          <span>API Access</span>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded ${tier.priority_support ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
          {tier.priority_support ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          <span>Priority</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 p-2 bg-muted/30">
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => onEdit(tier)}>
          <Edit className="h-3 w-3 mr-1" /> Edit
        </Button>
        <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={() => onDelete(tier.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
