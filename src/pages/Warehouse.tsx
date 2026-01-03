import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import WarehouseDashboard from '@/components/warehouse/WarehouseDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Warehouse as WarehouseIcon, ShieldAlert } from 'lucide-react';

export default function Warehouse() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'staff' | 'seller' | 'supplier' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    const checkRole = async () => {
      try {
        // Check if admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, is_verified_seller')
          .eq('id', user.id)
          .single();

        if (profile?.is_admin) {
          setUserRole('admin');
          setIsLoading(false);
          return;
        }

        // Check if warehouse staff
        const { data: staffRole } = await supabase
          .from('warehouse_staff')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (staffRole) {
          setUserRole(staffRole.role as 'manager' | 'staff');
          setIsLoading(false);
          return;
        }

        // Check seller
        if (profile?.is_verified_seller) {
          setUserRole('seller');
          setIsLoading(false);
          return;
        }

        // No access (supplier check would need supplier_applications table)
        setUserRole(null);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking role:', error);
        setUserRole(null);
        setIsLoading(false);
      }
    };

    checkRole();
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access the Warehouse Management System.
            Contact an administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <WarehouseIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Warehouse Management</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {userRole} Dashboard
          </p>
        </div>
      </div>

      <WarehouseDashboard userRole={userRole} />
    </div>
  );
}
