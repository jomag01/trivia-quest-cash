import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { 
  Loader2, UserCog, Plus, Trash2, Shield, Eye, Edit, 
  ChevronDown, ChevronRight, ArrowLeft, Search 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SubAdmin {
  id: string;
  user_id: string;
  role_name: string;
  allowed_tabs: string[];
  can_edit: boolean;
  is_active: boolean;
  created_at: string;
  profile?: { full_name: string; email: string };
}

// Admin tabs for visibility control
const ADMIN_TABS = [
  { group: 'Finances', items: [
    { id: 'sales-analytics', label: 'Sales Analytics' },
    { id: 'visitor-analytics', label: 'Visitor Analytics' },
    { id: 'accounting', label: 'Accounting & Payouts' },
    { id: 'credits', label: 'Credit Purchases' },
    { id: 'ai-packages', label: 'AI Package Purchases' },
    { id: 'payouts', label: 'Payout Requests' },
    { id: 'payout-accounts', label: 'Payout Accounts' },
    { id: 'qr-payment', label: 'QR Payment Settings' },
    { id: 'cash-deposits', label: 'Cash Deposits' },
  ]},
  { group: 'MLM & Network', items: [
    { id: 'member-activation', label: 'Member Activation' },
    { id: 'binary-system', label: 'AI Bees Match System' },
    { id: 'binary-accounting', label: 'AI Bees Accounting' },
    { id: 'binary-calculator', label: 'AI Bees Calculator' },
    { id: 'unilevel-settings', label: 'Unilevel Network' },
    { id: 'stair-step', label: 'Stair Step MLM' },
    { id: 'transfers', label: 'Upline Transfers' },
    { id: 'retailer-commissions', label: 'Retailer Commissions' },
    { id: 'seller-referrer', label: 'Seller Referrer' },
  ]},
  { group: 'Administration', items: [
    { id: 'shareholders', label: 'Shareholders' },
    { id: 'sub-admins', label: 'Sub-Admins' },
    { id: 'error-reports', label: 'Error Reports' },
  ]},
  { group: 'E-Commerce', items: [
    { id: 'product-categories', label: 'Product Categories' },
    { id: 'marketplace-categories', label: 'Marketplace Categories' },
    { id: 'marketplace-settings', label: 'Marketplace Settings' },
    { id: 'listing-features', label: 'Listing Features' },
    { id: 'products', label: 'Products' },
    { id: 'orders', label: 'Orders' },
    { id: 'pos-system', label: 'POS & Inventory' },
    { id: 'multivendor-products', label: 'User Products' },
    { id: 'seller-verification', label: 'Seller Verification' },
    { id: 'suppliers', label: 'Supplier Management' },
    { id: 'auctions', label: 'Auctions' },
  ]},
  { group: 'Shareholders', items: [
    { id: 'shareholders', label: 'Shareholder Management' },
  ]},
  { group: 'System Settings', items: [
    { id: 'homepage', label: 'Homepage Settings' },
    { id: 'app-logo', label: 'App Logo' },
    { id: 'legal-terms', label: 'Terms & Disclaimers' },
    { id: 'cookie-policy', label: 'Cookie Policy' },
    { id: 'cookie-placements', label: 'Cookie Placements' },
    { id: 'migration', label: 'Image Migration' },
    { id: 'system-reset', label: 'System Reset' },
  ]},
];

interface SubAdminManagementProps {
  onBack: () => void;
}

export default function SubAdminManagement({ onBack }: SubAdminManagementProps) {
  const { user } = useAuth();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Finances']);

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  const fetchSubAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('sub_admin_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each sub-admin
      const subAdminsWithProfiles = await Promise.all(
        (data || []).map(async (admin) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', admin.user_id)
            .single();
          return { ...admin, profile };
        })
      );

      setSubAdmins(subAdminsWithProfiles);
    } catch (error) {
      console.error('Error fetching sub-admins:', error);
      toast.error('Failed to load sub-admins');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    setSearchLoading(true);
    setFoundUser(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', `%${searchEmail}%`)
        .limit(1)
        .single();

      if (error || !data) {
        toast.error('User not found');
        return;
      }

      // Check if already a sub-admin
      const existing = subAdmins.find(s => s.user_id === data.id);
      if (existing) {
        toast.error('User is already a sub-admin');
        return;
      }

      setFoundUser(data);
    } catch (error) {
      toast.error('User not found');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddSubAdmin = async () => {
    if (!foundUser || !user?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('sub_admin_roles')
        .insert({
          user_id: foundUser.id,
          role_name: 'sub_admin',
          allowed_tabs: selectedTabs,
          can_edit: canEdit,
          is_active: true,
          added_by: user.id
        });

      if (error) throw error;

      toast.success(`${foundUser.full_name || foundUser.email} added as sub-admin`);
      setAddDialog(false);
      setFoundUser(null);
      setSearchEmail('');
      setSelectedTabs([]);
      setCanEdit(false);
      fetchSubAdmins();
    } catch (error) {
      console.error('Error adding sub-admin:', error);
      toast.error('Failed to add sub-admin');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSubAdmin = async () => {
    if (!editingSubAdmin) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('sub_admin_roles')
        .update({
          allowed_tabs: selectedTabs,
          can_edit: canEdit
        })
        .eq('id', editingSubAdmin.id);

      if (error) throw error;

      toast.success('Sub-admin permissions updated');
      setEditingSubAdmin(null);
      fetchSubAdmins();
    } catch (error) {
      console.error('Error updating sub-admin:', error);
      toast.error('Failed to update sub-admin');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubAdmin = async (id: string) => {
    if (!confirm('Remove this sub-admin?')) return;

    try {
      const { error } = await supabase
        .from('sub_admin_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Sub-admin removed');
      fetchSubAdmins();
    } catch (error) {
      toast.error('Failed to remove sub-admin');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('sub_admin_roles')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(isActive ? 'Sub-admin deactivated' : 'Sub-admin activated');
      fetchSubAdmins();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const toggleTab = (tabId: string) => {
    setSelectedTabs(prev => 
      prev.includes(tabId) 
        ? prev.filter(t => t !== tabId)
        : [...prev, tabId]
    );
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const selectAllInGroup = (groupItems: { id: string }[]) => {
    const allIds = groupItems.map(i => i.id);
    const allSelected = allIds.every(id => selectedTabs.includes(id));
    
    if (allSelected) {
      setSelectedTabs(prev => prev.filter(t => !allIds.includes(t)));
    } else {
      setSelectedTabs(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const openEditDialog = (subAdmin: SubAdmin) => {
    setEditingSubAdmin(subAdmin);
    setSelectedTabs(subAdmin.allowed_tabs || []);
    setCanEdit(subAdmin.can_edit);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Menu
      </Button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Sub-Admin Management</h2>
            <p className="text-muted-foreground">Manage sub-admin access and permissions</p>
          </div>
        </div>
        <Button onClick={() => setAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Sub-Admin
        </Button>
      </div>

      {/* Sub-Admins List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sub-Admins</CardTitle>
          <CardDescription>Users with limited admin access</CardDescription>
        </CardHeader>
        <CardContent>
          {subAdmins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sub-admins configured</p>
          ) : (
            <div className="space-y-4">
              {subAdmins.map((admin) => (
                <Card key={admin.id} className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold">{admin.profile?.full_name || 'Unknown'}</h4>
                        <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {admin.can_edit ? (
                          <Badge variant="outline" className="gap-1">
                            <Edit className="h-3 w-3" /> Can Edit
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Eye className="h-3 w-3" /> View Only
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{admin.profile?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Access to {admin.allowed_tabs?.length || 0} tabs
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Switch
                        checked={admin.is_active}
                        onCheckedChange={() => handleToggleActive(admin.id, admin.is_active)}
                      />
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(admin)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRemoveSubAdmin(admin.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Sub-Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
              <Button onClick={handleSearchUser} disabled={searchLoading}>
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {foundUser && (
              <>
                <Card className="p-3 bg-primary/5">
                  <p className="font-medium">{foundUser.full_name || foundUser.email}</p>
                  <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                </Card>

                <div className="flex items-center gap-2">
                  <Switch checked={canEdit} onCheckedChange={setCanEdit} />
                  <Label>Can Edit (otherwise View Only)</Label>
                </div>

                <div className="space-y-2">
                  <Label>Tab Access</Label>
                  <ScrollArea className="h-[250px] border rounded-lg p-2">
                    {ADMIN_TABS.map((group) => (
                      <Collapsible
                        key={group.group}
                        open={expandedGroups.includes(group.group)}
                        onOpenChange={() => toggleGroup(group.group)}
                      >
                        <CollapsibleTrigger className="w-full flex items-center justify-between p-2 hover:bg-muted rounded">
                          <span className="font-medium text-sm">{group.group}</span>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 text-xs"
                              onClick={(e) => { e.stopPropagation(); selectAllInGroup(group.items); }}
                            >
                              Toggle All
                            </Button>
                            {expandedGroups.includes(group.group) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-4 space-y-1">
                          {group.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 p-1">
                              <Checkbox
                                checked={selectedTabs.includes(item.id)}
                                onCheckedChange={() => toggleTab(item.id)}
                              />
                              <Label className="text-sm cursor-pointer" onClick={() => toggleTab(item.id)}>
                                {item.label}
                              </Label>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleAddSubAdmin} disabled={!foundUser || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Sub-Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSubAdmin} onOpenChange={() => setEditingSubAdmin(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Sub-Admin Permissions</DialogTitle>
          </DialogHeader>
          {editingSubAdmin && (
            <div className="space-y-4">
              <Card className="p-3 bg-muted/50">
                <p className="font-medium">{editingSubAdmin.profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">{editingSubAdmin.profile?.email}</p>
              </Card>

              <div className="flex items-center gap-2">
                <Switch checked={canEdit} onCheckedChange={setCanEdit} />
                <Label>Can Edit (otherwise View Only)</Label>
              </div>

              <div className="space-y-2">
                <Label>Tab Access</Label>
                <ScrollArea className="h-[250px] border rounded-lg p-2">
                  {ADMIN_TABS.map((group) => (
                    <Collapsible
                      key={group.group}
                      open={expandedGroups.includes(group.group)}
                      onOpenChange={() => toggleGroup(group.group)}
                    >
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-2 hover:bg-muted rounded">
                        <span className="font-medium text-sm">{group.group}</span>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 text-xs"
                            onClick={(e) => { e.stopPropagation(); selectAllInGroup(group.items); }}
                          >
                            Toggle All
                          </Button>
                          {expandedGroups.includes(group.group) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 space-y-1">
                        {group.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 p-1">
                            <Checkbox
                              checked={selectedTabs.includes(item.id)}
                              onCheckedChange={() => toggleTab(item.id)}
                            />
                            <Label className="text-sm cursor-pointer" onClick={() => toggleTab(item.id)}>
                              {item.label}
                            </Label>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdateSubAdmin} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}