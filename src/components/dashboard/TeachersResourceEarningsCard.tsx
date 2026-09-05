import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, ClipboardList, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Earning {
  id: string;
  resource_type: string;
  service_amount: number;
  commission_amount: number;
  commission_type: string;
  commission_value: number;
  created_at: string;
}

const LABELS: Record<string, string> = {
  lesson_plan: "Lesson Plan Maker",
  exam_generator: "Exam Maker",
};

export function TeachersResourceEarningsCard() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchEarnings = async () => {
      const { data, error } = await supabase
        .from("teachers_resource_referral_earnings")
        .select("id, resource_type, service_amount, commission_amount, commission_type, commission_value, created_at")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(25);

      if (!error) setEarnings((data as Earning[]) || []);
      setLoading(false);
    };

    fetchEarnings();

    const channel = supabase
      .channel(`teachers-resource-earnings-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "teachers_resource_referral_earnings",
          filter: `referrer_id=eq.${user.id}`,
        },
        (payload) => setEarnings((prev) => [payload.new as Earning, ...prev]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const total = earnings.reduce((sum, e) => sum + Number(e.commission_amount), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonth = earnings
    .filter((e) => new Date(e.created_at) >= monthStart)
    .reduce((sum, e) => sum + Number(e.commission_amount), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="w-5 h-5 text-emerald-500" />
          Teachers' Resources Referral Income
        </CardTitle>
        <CardDescription>
          Earn every time a teacher you referred pays for the Lesson Plan Maker or Exam Maker.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" /> Total earned
            </div>
            <p className="text-2xl font-bold text-emerald-600">₱{total.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" /> This month
            </div>
            <p className="text-2xl font-bold">₱{thisMonth.toFixed(2)}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : earnings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No teachers' resources income yet. Share your referral link with teachers to start earning.
          </p>
        ) : (
          <ScrollArea className="h-64 pr-3">
            <div className="space-y-2">
              {earnings.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950">
                      {e.resource_type === "exam_generator" ? (
                        <ClipboardList className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{LABELS[e.resource_type] || e.resource_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(e.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">
                      +₱{Number(e.commission_amount).toFixed(2)}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {e.commission_type === "fixed"
                        ? "Fixed"
                        : `${Number(e.commission_value)}% of ₱${Number(e.service_amount).toFixed(2)}`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
