import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function LocationEditor({ open, onOpenChange, location, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    location_name: '',
    latitude: '',
    longitude: '',
    note: '',
  });

  useEffect(() => {
    if (location) {
      setFormData({
        location_name: location.location_name || '',
        latitude: location.latitude?.toString() || '',
        longitude: location.longitude?.toString() || '',
        note: location.note || '',
      });
    } else {
      setFormData({
        location_name: '',
        latitude: '',
        longitude: '',
        note: '',
      });
    }
  }, [location, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      location_name: formData.location_name,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      note: formData.note,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Location</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Location Name</Label>
            <Input
              value={formData.location_name}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              placeholder="Koh Samui – Chaweng Bay"
              className="bg-slate-800 border-slate-700"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Latitude (optional)</Label>
              <Input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="9.5120"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <Label>Longitude (optional)</Label>
              <Input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="100.0136"
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <div>
            <Label>Note (optional)</Label>
            <Textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Anchored for the night..."
              className="bg-slate-800 border-slate-700 h-24"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-slate-700"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-cyan-500 hover:bg-cyan-400"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Update Location'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}