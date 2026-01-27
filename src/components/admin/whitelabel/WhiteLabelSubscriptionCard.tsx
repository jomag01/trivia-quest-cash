import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, Building2, Mail, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface WhiteLabelSubscription {
  id: string;
  client_id: string;
  tier_id: string;
  client_name: string;
  client_email: string;
  company_name: string;
  custom_domain: string;
  status: string;
  payment_method: string;
  payment_reference: string;
  amount_paid: number;
  starts_at: string;
  expires_at: string;
  admin_notes: string;
  created_at: string;
}

interface Props {
  subscription: WhiteLabelSubscription;
  tierName: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

export default function WhiteLabelSubscriptionCard({ subscription, tierName, onApprove, onReject }: Props) {
  const status = subscription.status || 'pending';
  
  return (
    <div className="rounded-lg border overflow-hidden bg-card">
      {/* Header with Status */}
      <div className="flex items-center justify-between p-2.5 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {subscription.client_name?.charAt(0) || '?'}
          </div>
          <div>
            <h4 className="font-medium text-sm">{subscription.client_name}</h4>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Mail className="h-2.5 w-2.5" />
              {subscription.client_email}
            </p>
          </div>
        </div>
        <Badge className={`${statusColors[status]} border-0 text-[10px] uppercase`}>
          {status}
        </Badge>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 p-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{subscription.company_name || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CreditCard className="h-3 w-3" />
          <span className="font-medium text-foreground">₱{subscription.amount_paid?.toLocaleString()}</span>
        </div>
        <div className="col-span-2">
          <Badge variant="secondary" className="text-[10px]">{tierName}</Badge>
          {subscription.custom_domain && (
            <Badge variant="outline" className="text-[10px] ml-1">{subscription.custom_domain}</Badge>
          )}
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          Applied: {format(new Date(subscription.created_at), 'MMM d, yyyy')}
        </div>
      </div>

      {/* Actions for Pending */}
      {status === 'pending' && (
        <div className="flex gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border-t">
          <Button size="sm" className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => onApprove(subscription.id)}>
            <Check className="h-3 w-3 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={() => onReject(subscription.id)}>
            <X className="h-3 w-3 mr-1" /> Reject
          </Button>
        </div>
      )}

      {/* Active Status Info */}
      {status === 'active' && subscription.expires_at && (
        <div className="p-2 bg-green-50 dark:bg-green-950/30 border-t text-[10px] text-green-700 dark:text-green-300 text-center">
          Expires: {format(new Date(subscription.expires_at), 'MMM d, yyyy')}
        </div>
      )}
    </div>
  );
}
