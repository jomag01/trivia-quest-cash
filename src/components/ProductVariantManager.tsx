import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageUploadCrop } from "@/components/ImageUploadCrop";

interface ProductVariant {
  id: string;
  product_id: string;
  variant_type: 'size' | 'color' | 'weight';
  variant_value: string;
  price_adjustment: number | null;
  stock_quantity: number | null;
  sku: string | null;
  image_url: string | null;
  hex_color: string | null;
}

interface ProductVariantManagerProps {
  productId: string;
  productName: string;
  onVariantsChange?: () => void;
}

const VARIANT_TYPES = [
  { value: 'size', label: 'Size' },
  { value: 'color', label: 'Color' },
  { value: 'weight', label: 'Weight' },
];

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
const COMMON_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Navy', hex: '#1E3A5F' },
  { name: 'Brown', hex: '#92400E' },
];

export const ProductVariantManager = ({
  productId,
  productName,
  onVariantsChange,
}: ProductVariantManagerProps) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    variant_type: 'size' as 'size' | 'color' | 'weight',
    variant_value: '',
    price_adjustment: '0',
    stock_quantity: '0',
    sku: '',
    image_url: '',
    hex_color: '',
  });

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("variant_type", { ascending: true })
      .order("variant_value", { ascending: true });

    if (error) {
      toast.error("Failed to load variants");
      console.error(error);
    } else {
      setVariants((data as ProductVariant[]) || []);
    }
    setLoading(false);
  };

  const handleAddVariant = async () => {
    if (!formData.variant_value.trim()) {
      toast.error("Please enter a variant value");
      return;
    }

    const variantData = {
      product_id: productId,
      variant_type: formData.variant_type,
      variant_value: formData.variant_value.trim(),
      price_adjustment: parseFloat(formData.price_adjustment) || 0,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      sku: formData.sku || null,
      image_url: formData.image_url || null,
      hex_color: formData.variant_type === 'color' ? formData.hex_color || null : null,
    };

    const { error } = await supabase
      .from("product_variants")
      .insert([variantData]);

    if (error) {
      toast.error("Failed to add variant");
      console.error(error);
      return;
    }

    toast.success("Variant added successfully");
    resetForm();
    fetchVariants();
    onVariantsChange?.();
  };

  const handleDeleteVariant = async (id: string) => {
    if (!confirm("Delete this variant?")) return;

    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete variant");
      console.error(error);
      return;
    }

    toast.success("Variant deleted");
    fetchVariants();
    onVariantsChange?.();
  };

  const handleUpdateVariantImage = async (variantId: string, imageUrl: string) => {
    const { error } = await supabase
      .from("product_variants")
      .update({ image_url: imageUrl })
      .eq("id", variantId);

    if (error) {
      toast.error("Failed to update variant image");
      console.error(error);
      return;
    }

    toast.success("Variant image updated");
    setUploadingImageFor(null);
    fetchVariants();
    onVariantsChange?.();
  };

  const resetForm = () => {
    setFormData({
      variant_type: 'size',
      variant_value: '',
      price_adjustment: '0',
      stock_quantity: '0',
      sku: '',
      image_url: '',
      hex_color: '',
    });
    setShowAddForm(false);
  };

  const handleColorSelect = (color: { name: string; hex: string }) => {
    setFormData({
      ...formData,
      variant_value: color.name,
      hex_color: color.hex,
    });
  };

  const groupedVariants = variants.reduce((acc, variant) => {
    const type = variant.variant_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(variant);
    return acc;
  }, {} as Record<string, ProductVariant[]>);

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading variants...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Product Variants</h3>
        <Button size="sm" onClick={() => setShowAddForm(true)} disabled={showAddForm}>
          <Plus className="w-4 h-4 mr-1" />
          Add Variant
        </Button>
      </div>

      {/* Add Variant Form */}
      {showAddForm && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add New Variant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Variant Type</Label>
                <Select
                  value={formData.variant_type}
                  onValueChange={(value: 'size' | 'color' | 'weight') =>
                    setFormData({ ...formData, variant_type: value, variant_value: '', hex_color: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIANT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Value</Label>
                <Input
                  value={formData.variant_value}
                  onChange={(e) => setFormData({ ...formData, variant_value: e.target.value })}
                  placeholder={
                    formData.variant_type === 'size' ? 'e.g., Large' :
                    formData.variant_type === 'color' ? 'e.g., Red' : 'e.g., 500g'
                  }
                />
              </div>
            </div>

            {/* Quick select for sizes */}
            {formData.variant_type === 'size' && (
              <div>
                <Label className="text-xs text-muted-foreground">Quick Select</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {COMMON_SIZES.map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={formData.variant_value === size ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setFormData({ ...formData, variant_value: size })}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick select for colors */}
            {formData.variant_type === 'color' && (
              <div>
                <Label className="text-xs text-muted-foreground">Quick Select Color</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COMMON_COLORS.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.variant_value === color.name 
                          ? 'border-primary ring-2 ring-primary/50' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => handleColorSelect(color)}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  <Label className="text-xs">Custom Color (Hex)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={formData.hex_color || '#000000'}
                      onChange={(e) => setFormData({ ...formData, hex_color: e.target.value })}
                      className="w-12 h-8 p-0 border-0"
                    />
                    <Input
                      value={formData.hex_color}
                      onChange={(e) => setFormData({ ...formData, hex_color: e.target.value })}
                      placeholder="#FF0000"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Price Adjustment (₱)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price_adjustment}
                  onChange={(e) => setFormData({ ...formData, price_adjustment: e.target.value })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">+ or - from base price</p>
              </div>
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                />
              </div>
              <div>
                <Label>SKU</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Variant Image Upload */}
            <div>
              <Label>Variant Image</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Upload an image specific to this variant (e.g., product in this color)
              </p>
              <ImageUploadCrop
                currentImage={formData.image_url}
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                maxSizeKB={500}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleAddVariant}>
                Add Variant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Variants List */}
      {Object.keys(groupedVariants).length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No variants added yet. Add variants like sizes and colors.
        </p>
      )}

      {Object.entries(groupedVariants).map(([type, typeVariants]) => (
        <div key={type} className="space-y-2">
          <h4 className="text-sm font-medium capitalize flex items-center gap-2">
            {type}
            <Badge variant="secondary" className="text-xs">{typeVariants.length}</Badge>
          </h4>
          <div className="grid gap-2">
            {typeVariants.map((variant) => (
              <Card key={variant.id} className="p-3">
                <div className="flex items-center gap-3">
                  {/* Variant Image or Color Swatch */}
                  {variant.image_url ? (
                    <img
                      src={variant.image_url}
                      alt={variant.variant_value}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  ) : variant.variant_type === 'color' && variant.hex_color ? (
                    <div
                      className="w-12 h-12 rounded border"
                      style={{ backgroundColor: variant.hex_color }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{variant.variant_value}</span>
                      {variant.sku && (
                        <Badge variant="outline" className="text-xs">
                          {variant.sku}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {variant.price_adjustment !== 0 && (
                        <span className={variant.price_adjustment! > 0 ? "text-green-600" : "text-red-600"}>
                          {variant.price_adjustment! > 0 ? '+' : ''}₱{variant.price_adjustment}
                        </span>
                      )}
                      {variant.price_adjustment !== 0 && ' • '}
                      Stock: {variant.stock_quantity || 0}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    {uploadingImageFor === variant.id ? (
                      <div className="w-48">
                        <ImageUploadCrop
                          currentImage={variant.image_url || ""}
                          onImageUploaded={(url) => handleUpdateVariantImage(variant.id, url)}
                          maxSizeKB={500}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setUploadingImageFor(null)}
                          className="mt-1 w-full"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setUploadingImageFor(variant.id)}
                          title="Upload Image"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteVariant(variant.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
