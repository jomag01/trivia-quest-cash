import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  EyeOff, 
  Eye, 
  Loader2, 
  Calendar,
  Hexagon,
  Crown,
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
  hidden_for_monthly: boolean;   // Student Plan
  hidden_for_biannual: boolean;  // Business Plan
  hidden_for_yearly: boolean;    // Elite Plan
}

export default function ServiceVisibilityManager() {
  const [loading, setLoading] = useState(true);
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

  const toggleTierVisibility = async (
    id: string, 
    tier: 'student' | 'business' | 'elite', 
    currentValue: boolean
  ) => {
    try {
      const fieldMap = {
        student: 'hidden_for_monthly',
        business: 'hidden_for_biannual',
        elite: 'hidden_for_yearly'
      };

      const updateField = fieldMap[tier];

      const { error } = await supabase
        .from('ai_monthly_restrictions')
        .update({ 
          [updateField]: !currentValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setRestrictions(prev => prev.map(r => 
        r.id === id ? { 
          ...r, 
          [updateField]: !currentValue
        } : r
      ));

      const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
      toast.success(`${!currentValue ? 'Locked' : 'Unlocked'} for ${tierName} Plan`);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
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
          Service Visibility Control
        </CardTitle>
        <CardDescription className="space-y-1">
          <p>Control which AI Hub services are accessible per subscription tier.</p>
          <p className="text-xs text-orange-600 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Toggle ON to lock (hide) a service for that tier. Toggle OFF to unlock (show) it.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>AI Hub Service</TableHead>
              <TableHead className="text-center w-28">
                <div className="flex flex-col items-center gap-1">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-xs">Student</span>
                </div>
              </TableHead>
              <TableHead className="text-center w-28">
                <div className="flex flex-col items-center gap-1">
                  <Hexagon className="h-4 w-4 text-purple-500" />
                  <span className="text-xs">Business</span>
                </div>
              </TableHead>
              <TableHead className="text-center w-28">
                <div className="flex flex-col items-center gap-1">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span className="text-xs">Elite</span>
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
                {/* Student Plan */}
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1">
                          <Switch
                            checked={r.hidden_for_monthly}
                            onCheckedChange={() => toggleTierVisibility(r.id, 'student', r.hidden_for_monthly)}
                          />
                          {r.hidden_for_monthly ? (
                            <EyeOff className="h-3 w-3 text-red-500" />
                          ) : (
                            <Eye className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {r.hidden_for_monthly ? 'Locked for Student' : 'Unlocked for Student'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                {/* Business Plan */}
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1">
                          <Switch
                            checked={r.hidden_for_biannual}
                            onCheckedChange={() => toggleTierVisibility(r.id, 'business', r.hidden_for_biannual)}
                          />
                          {r.hidden_for_biannual ? (
                            <EyeOff className="h-3 w-3 text-red-500" />
                          ) : (
                            <Eye className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {r.hidden_for_biannual ? 'Locked for Business' : 'Unlocked for Business'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                {/* Elite Plan */}
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1">
                          <Switch
                            checked={r.hidden_for_yearly}
                            onCheckedChange={() => toggleTierVisibility(r.id, 'elite', r.hidden_for_yearly)}
                          />
                          {r.hidden_for_yearly ? (
                            <EyeOff className="h-3 w-3 text-red-500" />
                          ) : (
                            <Eye className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {r.hidden_for_yearly ? 'Locked for Elite' : 'Unlocked for Elite'}
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
            No AI Hub services configured. Add services in the database.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
