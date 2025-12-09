import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryField {
  id?: string;
  category_id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options: string[];
  is_required: boolean;
  display_order: number;
  placeholder: string | null;
  help_text: string | null;
}

interface ServiceCategoryFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'list', label: 'List (Add Multiple Items)' },
  { value: 'images', label: 'Image Gallery' },
];

const ServiceCategoryFieldsDialog = ({
  open,
  onOpenChange,
  categoryId,
  categoryName,
}: ServiceCategoryFieldsDialogProps) => {
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && categoryId) {
      fetchFields();
    }
  }, [open, categoryId]);

  const fetchFields = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_category_fields")
      .select("*")
      .eq("category_id", categoryId)
      .order("display_order");

    if (error) {
      toast.error("Failed to load fields");
    } else {
      setFields((data || []).map((f: any) => ({
        ...f,
        field_options: Array.isArray(f.field_options) ? f.field_options : []
      })));
    }
    setLoading(false);
  };

  const addField = () => {
    const newField: CategoryField = {
      category_id: categoryId,
      field_name: `field_${Date.now()}`,
      field_label: "New Field",
      field_type: "text",
      field_options: [],
      is_required: false,
      display_order: fields.length,
      placeholder: null,
      help_text: null,
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<CategoryField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    
    // Auto-generate field_name from field_label
    if (updates.field_label) {
      newFields[index].field_name = updates.field_label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_');
    }
    
    setFields(newFields);
  };

  const removeField = (index: number) => {
    const field = fields[index];
    if (field.id) {
      // Mark for deletion
      setFields(fields.filter((_, i) => i !== index));
    } else {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Get existing field IDs
      const { data: existingFields } = await supabase
        .from("service_category_fields")
        .select("id")
        .eq("category_id", categoryId);
      
      const existingIds = new Set((existingFields || []).map(f => f.id));
      const currentIds = new Set(fields.filter(f => f.id).map(f => f.id));
      
      // Delete removed fields
      const toDelete = [...existingIds].filter(id => !currentIds.has(id));
      if (toDelete.length > 0) {
        await supabase
          .from("service_category_fields")
          .delete()
          .in("id", toDelete);
      }
      
      // Upsert all fields
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const fieldData = {
          category_id: categoryId,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: field.field_options,
          is_required: field.is_required,
          display_order: i,
          placeholder: field.placeholder,
          help_text: field.help_text,
        };
        
        if (field.id) {
          await supabase
            .from("service_category_fields")
            .update(fieldData)
            .eq("id", field.id);
        } else {
          await supabase
            .from("service_category_fields")
            .insert(fieldData);
        }
      }
      
      toast.success("Fields saved successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save fields");
    } finally {
      setSaving(false);
    }
  };

  const addFieldOption = (fieldIndex: number) => {
    const newFields = [...fields];
    newFields[fieldIndex].field_options = [
      ...newFields[fieldIndex].field_options,
      ""
    ];
    setFields(newFields);
  };

  const updateFieldOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const newFields = [...fields];
    newFields[fieldIndex].field_options[optionIndex] = value;
    setFields(newFields);
  };

  const removeFieldOption = (fieldIndex: number, optionIndex: number) => {
    const newFields = [...fields];
    newFields[fieldIndex].field_options = newFields[fieldIndex].field_options.filter(
      (_, i) => i !== optionIndex
    );
    setFields(newFields);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Customize Fields for: {categoryName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Loading fields...</div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define custom fields that service providers must fill when creating services in this category.
            </p>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <Card key={field.id || index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                      
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Field Label *</Label>
                            <Input
                              value={field.field_label}
                              onChange={(e) => updateField(index, { field_label: e.target.value })}
                              placeholder="e.g., Destinations"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Field Type *</Label>
                            <Select
                              value={field.field_type}
                              onValueChange={(value) => updateField(index, { field_type: value })}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Placeholder</Label>
                            <Input
                              value={field.placeholder || ""}
                              onChange={(e) => updateField(index, { placeholder: e.target.value })}
                              placeholder="e.g., Enter destination"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Help Text</Label>
                            <Input
                              value={field.help_text || ""}
                              onChange={(e) => updateField(index, { help_text: e.target.value })}
                              placeholder="e.g., Add all destinations"
                              className="h-9"
                            />
                          </div>
                        </div>

                        {/* Options for select/multiselect */}
                        {(field.field_type === 'select' || field.field_type === 'multiselect') && (
                          <div>
                            <Label className="text-xs">Options</Label>
                            <div className="space-y-2 mt-1">
                              {field.field_options.map((option, optIndex) => (
                                <div key={optIndex} className="flex gap-2">
                                  <Input
                                    value={option}
                                    onChange={(e) => updateFieldOption(index, optIndex, e.target.value)}
                                    placeholder={`Option ${optIndex + 1}`}
                                    className="h-8"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => removeFieldOption(index, optIndex)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addFieldOption(index)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Option
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.is_required}
                              onCheckedChange={(checked) => updateField(index, { is_required: checked })}
                            />
                            <Label className="text-xs">Required</Label>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {field.field_name}
                          </Badge>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  No custom fields defined. Add fields to customize this category.
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button type="button" variant="outline" onClick={addField}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Fields"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServiceCategoryFieldsDialog;
