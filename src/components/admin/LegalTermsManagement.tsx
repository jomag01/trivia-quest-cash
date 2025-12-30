import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Save, Loader2, Eye, Edit, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LegalTerm {
  id: string;
  term_type: string;
  title: string;
  content: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

const TERM_TYPES = [
  { value: 'seller_terms', label: 'Seller Terms', description: 'Terms for marketplace sellers' },
  { value: 'supplier_terms', label: 'Supplier Terms', description: 'Terms for B2B suppliers' },
  { value: 'auction_terms', label: 'Auction Terms', description: 'Terms for auction sellers' },
  { value: 'income_disclaimer', label: 'Income Disclaimer', description: 'SEC compliance disclaimer' },
];

export default function LegalTermsManagement() {
  const [terms, setTerms] = useState<LegalTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<LegalTerm | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const { data, error } = await supabase
        .from("legal_terms")
        .select("*")
        .order("term_type");

      if (error) throw error;
      setTerms(data || []);
    } catch (error: any) {
      toast.error("Failed to load terms");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTerm = (term: LegalTerm) => {
    setSelectedTerm(term);
    setEditTitle(term.title);
    setEditContent(term.content);
  };

  const handleSave = async () => {
    if (!selectedTerm) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("legal_terms")
        .update({
          title: editTitle,
          content: editContent,
          version: selectedTerm.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedTerm.id);

      if (error) throw error;

      toast.success("Terms updated successfully");
      fetchTerms();
      setSelectedTerm({ ...selectedTerm, title: editTitle, content: editContent, version: selectedTerm.version + 1 });
    } catch (error: any) {
      toast.error(error.message || "Failed to update terms");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (term: LegalTerm) => {
    try {
      const { error } = await supabase
        .from("legal_terms")
        .update({ is_active: !term.is_active })
        .eq("id", term.id);

      if (error) throw error;
      toast.success(`Terms ${!term.is_active ? 'activated' : 'deactivated'}`);
      fetchTerms();
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const handlePreview = (content: string) => {
    setPreviewContent(content);
    setPreviewOpen(true);
  };

  const getTermTypeInfo = (termType: string) => {
    return TERM_TYPES.find(t => t.value === termType) || { label: termType, description: '' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Legal Terms Management
          </CardTitle>
          <CardDescription>
            Manage seller, supplier, and auction terms. Changes are versioned for compliance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Terms List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Available Terms</h3>
              {terms.map((term) => {
                const info = getTermTypeInfo(term.term_type);
                return (
                  <Card
                    key={term.id}
                    className={`cursor-pointer transition-all ${
                      selectedTerm?.id === term.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectTerm(term)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{info.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{info.description}</p>
                        </div>
                        <Badge variant={term.is_active ? "default" : "secondary"} className="text-xs">
                          v{term.version}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          Updated: {new Date(term.updated_at).toLocaleDateString()}
                        </span>
                        <Switch
                          checked={term.is_active}
                          onCheckedChange={() => toggleActive(term)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Editor */}
            <div className="lg:col-span-2 space-y-4">
              {selectedTerm ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Edit: {getTermTypeInfo(selectedTerm.term_type).label}</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(editContent)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Content (Markdown supported)</Label>
                      <Textarea
                        id="content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={20}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Edit className="h-12 w-12 mb-4 opacity-50" />
                  <p>Select a term type to edit</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terms Preview</DialogTitle>
            <DialogDescription>
              How the terms will appear to users
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {previewContent.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-lg font-semibold mt-3 mb-1">{line.slice(3)}</h2>;
                }
                if (line.startsWith('- ')) {
                  return <li key={i} className="ml-4">{line.slice(2)}</li>;
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="font-bold">{line.slice(2, -2)}</p>;
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                return <p key={i}>{line}</p>;
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
