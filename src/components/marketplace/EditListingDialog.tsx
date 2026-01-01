import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ListingFeaturesEditor } from '@/components/common/ListingFeaturesEditor';

interface EditListingDialogProps {
  listing: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditListingDialog({ listing, open, onOpenChange }: EditListingDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: listing.title || '',
    description: listing.description || '',
    price: listing.price?.toString() || '',
    price_type: listing.price_type || 'fixed',
    location: listing.location || '',
    city: listing.city || '',
    province: listing.province || '',
    condition: listing.condition || 'new',
    contact_email: listing.contact_email || '',
    contact_phone: listing.contact_phone || '',
    // Property fields
    bedrooms: listing.bedrooms?.toString() || '',
    bathrooms: listing.bathrooms?.toString() || '',
    area_sqm: listing.area_sqm?.toString() || '',
    // Vehicle fields
    brand: listing.brand || '',
    model: listing.model || '',
    year: listing.year?.toString() || '',
    mileage: listing.mileage?.toString() || '',
    fuel_type: listing.fuel_type || '',
    transmission: listing.transmission || '',
    // Rental fields
    min_stay_nights: listing.min_stay_nights?.toString() || '',
    max_guests: listing.max_guests?.toString() || '',
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updateData: any = {
        title: formData.title,
        description: formData.description || null,
        price: parseFloat(formData.price),
        price_type: formData.price_type,
        location: formData.location || null,
        city: formData.city || null,
        province: formData.province || null,
        condition: formData.condition || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
      };

      // Add category-specific fields
      if (listing.category === 'property_sale' || listing.category === 'property_rent') {
        updateData.bedrooms = formData.bedrooms ? parseInt(formData.bedrooms) : null;
        updateData.bathrooms = formData.bathrooms ? parseInt(formData.bathrooms) : null;
        updateData.area_sqm = formData.area_sqm ? parseFloat(formData.area_sqm) : null;
      }

      if (listing.category === 'vehicle_sale') {
        updateData.brand = formData.brand || null;
        updateData.model = formData.model || null;
        updateData.year = formData.year ? parseInt(formData.year) : null;
        updateData.mileage = formData.mileage ? parseInt(formData.mileage) : null;
        updateData.fuel_type = formData.fuel_type || null;
        updateData.transmission = formData.transmission || null;
      }

      if (listing.category === 'hotel_staycation' || listing.category === 'room_rent') {
        updateData.min_stay_nights = formData.min_stay_nights ? parseInt(formData.min_stay_nights) : null;
        updateData.max_guests = formData.max_guests ? parseInt(formData.max_guests) : null;
      }

      const { error } = await supabase
        .from('marketplace_listings')
        .update(updateData)
        .eq('id', listing.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      toast.success('Listing updated!');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update listing'),
  });

  const isProperty = listing.category === 'property_sale' || listing.category === 'property_rent';
  const isVehicle = listing.category === 'vehicle_sale';
  const isRental = listing.category === 'hotel_staycation' || listing.category === 'room_rent';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price (₱) *</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Price Type</Label>
              <Select
                value={formData.price_type}
                onValueChange={(value) => setFormData({ ...formData, price_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="negotiable">Negotiable</SelectItem>
                  <SelectItem value="per_night">Per Night</SelectItem>
                  <SelectItem value="per_month">Per Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <Label>Province</Label>
              <Input
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Location / Address</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          {/* Property-specific fields */}
          {isProperty && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Bedrooms</Label>
                <Input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                />
              </div>
              <div>
                <Label>Bathrooms</Label>
                <Input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                />
              </div>
              <div>
                <Label>Area (sqm)</Label>
                <Input
                  type="number"
                  value={formData.area_sqm}
                  onChange={(e) => setFormData({ ...formData, area_sqm: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Vehicle-specific fields */}
          {isVehicle && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Brand</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Mileage (km)</Label>
                  <Input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fuel Type</Label>
                  <Select
                    value={formData.fuel_type}
                    onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasoline">Gasoline</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transmission</Label>
                  <Select
                    value={formData.transmission}
                    onValueChange={(value) => setFormData({ ...formData, transmission: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Rental-specific fields */}
          {isRental && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Stay (nights)</Label>
                <Input
                  type="number"
                  value={formData.min_stay_nights}
                  onChange={(e) => setFormData({ ...formData, min_stay_nights: e.target.value })}
                />
              </div>
              <div>
                <Label>Max Guests</Label>
                <Input
                  type="number"
                  value={formData.max_guests}
                  onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
          </div>

          {/* Custom Features */}
          <ListingFeaturesEditor entityType="marketplace" entityId={listing.id} />

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !formData.title || !formData.price}
              className="flex-1"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
