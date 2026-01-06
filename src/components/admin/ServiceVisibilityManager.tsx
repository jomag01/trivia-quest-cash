import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  EyeOff, 
  Eye, 
  Loader2, 
  Calendar,
  Hexagon,
  Crown,
  Save,
  Info
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FeatureRestriction {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string;
  is_hidden: boolean;
  hidden_for_monthly: boolean;
  hidden_for_biannual: boolean;
  hidden_for_yearly: boolean;
}

export default function ServiceVisibilityManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restrictions, setRestrictions] = useState<FeatureRestriction[]>([]);

  useEffect(() => {
    fetchRestrictions();
  }, []);

  const fetchRestrictions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_monthly_restrictions')
        .select('*')
        .order('feature_name');

      if (error) throw error;
      if (data) setRestrictions(data as FeatureRestriction[]);
    } catch (error) {
      console.error('Error fetching restrictions:', error);
      toast.error('Failed to load restrictions');
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (id: string, field: 'hidden_for_monthly' | 'hidden_for_biannual' | 'hidden_for_yearly', currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_monthly_restrictions')
        .update({ 
          [field]: !currentValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setRestrictions(prev => prev.map(r => 
        r.id === id ? { ...r, [field]: !currentValue } : r
      ));

      const planName = field === 'hidden_for_monthly' ? 'Monthly' : field === 'hidden_for_biannual' ? '6-Month' : 'Yearly';
      toast.success(`Feature ${!currentValue ? 'hidden from' : 'shown to'} ${planName} subscribers`);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'monthly': return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'biannual': return <Hexagon className="h-4 w-4 text-purple-500" />;
      case 'yearly': return <Crown className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-primary" />
          Service Visibility by Plan
        </CardTitle>
        <CardDescription className="space-y-1">
          <p>Control which AI features are visible to each subscription plan.</p>
          <p className="text-xs text-orange-600 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Hidden features are completely inaccessible - users cannot use unlock popups until they upgrade.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {getPlanIcon('monthly')}
                  <span>Monthly</span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {getPlanIcon('biannual')}
                  <span>6-Month</span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {getPlanIcon('yearly')}
                  <span>Yearly</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restrictions.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{r.feature_name}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={r.hidden_for_monthly}
                            onCheckedChange={() => toggleVisibility(r.id, 'hidden_for_monthly', r.hidden_for_monthly)}
                          />
                          {r.hidden_for_monthly ? (
                            <EyeOff className="h-4 w-4 text-red-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {r.hidden_for_monthly ? 'Hidden from Monthly' : 'Visible to Monthly'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={r.hidden_for_biannual}
                            onCheckedChange={() => toggleVisibility(r.id, 'hidden_for_biannual', r.hidden_for_biannual)}
                          />
                          {r.hidden_for_biannual ? (
                            <EyeOff className="h-4 w-4 text-red-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {r.hidden_for_biannual ? 'Hidden from 6-Month' : 'Visible to 6-Month'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={r.hidden_for_yearly}
                            onCheckedChange={() => toggleVisibility(r.id, 'hidden_for_yearly', r.hidden_for_yearly)}
                          />
                          {r.hidden_for_yearly ? (
                            <EyeOff className="h-4 w-4 text-red-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {r.hidden_for_yearly ? 'Hidden from Yearly' : 'Visible to Yearly'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {restrictions.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No feature restrictions configured. Features are managed in the database.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
