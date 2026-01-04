import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Eye, EyeOff, Save, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ALL_SYSTEM_TABS, useAdminHiddenTabs, SystemTab } from '@/hooks/useHiddenTabs';
import { useAuth } from '@/contexts/AuthContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TabVisibilityManagerProps {
  userId: string;
  userName: string;
  onSaved?: () => void;
}

export function TabVisibilityManager({ userId, userName, onSaved }: TabVisibilityManagerProps) {
  const { user: admin } = useAuth();
  const { hiddenTabs, loading, saving, toggleTab, toggleCategory, saveHiddenTabs } = useAdminHiddenTabs(userId);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['dashboard', 'aiHub', 'shop', 'feed']);
  const [expandedTabs, setExpandedTabs] = useState<string[]>([]);

  const toggleCategoryExpand = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleTabExpand = (tabId: string) => {
    setExpandedTabs(prev =>
      prev.includes(tabId)
        ? prev.filter(t => t !== tabId)
        : [...prev, tabId]
    );
  };

  const handleSave = async () => {
    if (!admin?.id) return;
    
    const success = await saveHiddenTabs(admin.id);
    if (success) {
      toast.success(`Tab visibility settings saved for ${userName}`);
      onSaved?.();
    } else {
      toast.error('Failed to save tab visibility settings');
    }
  };

  const getCategoryHiddenCount = (tabs: SystemTab[]) => {
    let count = 0;
    tabs.forEach(tab => {
      if (hiddenTabs.includes(tab.id)) count++;
      if (tab.components) {
        tab.components.forEach(comp => {
          if (hiddenTabs.includes(comp.id)) count++;
        });
      }
    });
    return count;
  };

  const getTabHiddenComponentCount = (tab: SystemTab) => {
    if (!tab.components) return 0;
    return tab.components.filter(comp => hiddenTabs.includes(comp.id)).length;
  };

  const isCategoryAllHidden = (tabs: SystemTab[]) => {
    return tabs.every(tab => {
      const tabHidden = hiddenTabs.includes(tab.id);
      const allComponentsHidden = !tab.components || tab.components.every(comp => hiddenTabs.includes(comp.id));
      return tabHidden && allComponentsHidden;
    });
  };

  const isTabFullyHidden = (tab: SystemTab) => {
    const tabHidden = hiddenTabs.includes(tab.id);
    const allComponentsHidden = !tab.components || tab.components.every(comp => hiddenTabs.includes(comp.id));
    return tabHidden && allComponentsHidden;
  };

  const toggleEntireCategory = (tabs: SystemTab[], hide: boolean) => {
    const allIds: string[] = [];
    tabs.forEach(tab => {
      allIds.push(tab.id);
      if (tab.components) {
        tab.components.forEach(comp => allIds.push(comp.id));
      }
    });
    toggleCategory(allIds, hide);
  };

  const toggleEntireTab = (tab: SystemTab) => {
    const allIds = [tab.id];
    if (tab.components) {
      tab.components.forEach(comp => allIds.push(comp.id));
    }
    const isCurrentlyHidden = isTabFullyHidden(tab);
    toggleCategory(allIds, !isCurrentlyHidden);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-amber-500" />
            Tab Visibility for {userName}
          </span>
          <Badge variant="secondary" className="text-xs">
            {hiddenTabs.length} items hidden
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {Object.entries(ALL_SYSTEM_TABS).map(([categoryKey, category]) => (
              <Collapsible
                key={categoryKey}
                open={expandedCategories.includes(categoryKey)}
                onOpenChange={() => toggleCategoryExpand(categoryKey)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors">
                      <div className="flex items-center gap-2">
                        {expandedCategories.includes(categoryKey) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium text-sm">{category.label}</span>
                        {getCategoryHiddenCount(category.tabs) > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {getCategoryHiddenCount(category.tabs)} hidden
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEntireCategory(category.tabs, !isCategoryAllHidden(category.tabs));
                          }}
                        >
                          {isCategoryAllHidden(category.tabs) ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" /> Show All
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" /> Hide All
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 space-y-2 bg-background">
                      {category.tabs.map((tab) => (
                        <div key={tab.id} className="space-y-1">
                          {/* Tab Row */}
                          <div
                            className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                              hiddenTabs.includes(tab.id) 
                                ? 'bg-destructive/10 border border-destructive/20' 
                                : 'bg-muted/30 hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                id={tab.id}
                                checked={hiddenTabs.includes(tab.id)}
                                onCheckedChange={() => toggleTab(tab.id)}
                              />
                              <Label
                                htmlFor={tab.id}
                                className={`text-sm cursor-pointer flex-1 ${
                                  hiddenTabs.includes(tab.id) ? 'text-destructive line-through' : ''
                                }`}
                              >
                                {tab.label}
                              </Label>
                              
                              {tab.components && tab.components.length > 0 && (
                                <div className="flex items-center gap-2">
                                  {getTabHiddenComponentCount(tab) > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">
                                      {getTabHiddenComponentCount(tab)}/{tab.components.length}
                                    </Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTabExpand(tab.id);
                                    }}
                                  >
                                    {expandedTabs.includes(tab.id) ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <Layers className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {tab.components && tab.components.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleEntireTab(tab);
                                  }}
                                >
                                  {isTabFullyHidden(tab) ? 'Show' : 'Hide'} All
                                </Button>
                              )}
                              {hiddenTabs.includes(tab.id) ? (
                                <EyeOff className="h-3 w-3 text-destructive" />
                              ) : (
                                <Eye className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          
                          {/* Sub-components */}
                          {tab.components && expandedTabs.includes(tab.id) && (
                            <div className="ml-6 pl-3 border-l-2 border-muted space-y-1">
                              {tab.components.map((comp) => (
                                <div
                                  key={comp.id}
                                  className={`flex items-center justify-between p-1.5 rounded-md transition-colors ${
                                    hiddenTabs.includes(comp.id)
                                      ? 'bg-destructive/5 border border-destructive/10'
                                      : 'bg-muted/20 hover:bg-muted/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={comp.id}
                                      checked={hiddenTabs.includes(comp.id)}
                                      onCheckedChange={() => toggleTab(comp.id)}
                                    />
                                    <Label
                                      htmlFor={comp.id}
                                      className={`text-xs cursor-pointer ${
                                        hiddenTabs.includes(comp.id) ? 'text-destructive/80 line-through' : 'text-muted-foreground'
                                      }`}
                                    >
                                      {comp.label}
                                    </Label>
                                  </div>
                                  {hiddenTabs.includes(comp.id) ? (
                                    <EyeOff className="h-2.5 w-2.5 text-destructive/60" />
                                  ) : (
                                    <Eye className="h-2.5 w-2.5 text-muted-foreground/50" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Tab Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}