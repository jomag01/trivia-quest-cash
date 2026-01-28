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

  const toggleVisibility = async (id: string, currentValue: boolean) => {
    try {
      // Update all monthly fields together since all plans are now monthly
      const { error } = await supabase
        .from('ai_monthly_restrictions')
        .update({ 
          hidden_for_monthly: !currentValue,
          hidden_for_biannual: !currentValue,
          hidden_for_yearly: !currentValue,
          is_hidden: !currentValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setRestrictions(prev => prev.map(r => 
        r.id === id ? { 
          ...r, 
          hidden_for_monthly: !currentValue,
          hidden_for_biannual: !currentValue,
          hidden_for_yearly: !currentValue,
          is_hidden: !currentValue
        } : r
      ));

      toast.success(`Feature ${!currentValue ? 'locked for' : 'unlocked for'} all subscribers`);
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
          <p>Control which AI Hub services are accessible to subscribers.</p>
          <p className="text-xs text-orange-600 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Locked services are completely inaccessible - users cannot use them until unlocked.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>AI Hub Service</TableHead>
              <TableHead className="text-center w-32">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Access</span>
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
                            checked={r.is_hidden || r.hidden_for_monthly}
                            onCheckedChange={() => toggleVisibility(r.id, r.is_hidden || r.hidden_for_monthly)}
                          />
                          {(r.is_hidden || r.hidden_for_monthly) ? (
                            <EyeOff className="h-4 w-4 text-red-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {(r.is_hidden || r.hidden_for_monthly) ? 'Locked - Click to unlock' : 'Unlocked - Click to lock'}
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