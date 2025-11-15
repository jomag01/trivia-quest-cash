import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const ActiveUsersStats = () => {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('active-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setActiveUsers(count);
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setActiveUsers(count);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setActiveUsers(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Active Users</p>
          <p className="text-3xl font-bold mt-2">{activeUsers}</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="w-6 h-6 text-primary" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-muted-foreground">Live now</span>
      </div>
    </Card>
  );
};
