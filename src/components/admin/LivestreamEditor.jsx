import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

export default function LivestreamEditor({ open, onOpenChange, livestream, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    title: '',
    youtube_url: '',
    note: '',
    is_active: true,
    scheduled_for: '',
  });

  useEffect(() => {
    if (livestream) {
      setFormData({
        title: livestream.title || '',
        youtube_url: livestream.youtube_url || '',
        note: livestream.note || '',
        is_active: livestream.is_active !== false,
        scheduled_for: livestream.scheduled_for ? livestream.scheduled_for.slice(0, 16) : '',
      });
    } else {
      setFormData({
        title: '',
        youtube_url: '',
        note: '',
        is_active: true,
        scheduled_for: '',
      });
    }
  }, [livestream, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Livestream</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Stream Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Live from the boat!"
              className="bg-slate-800 border-slate-700"
              required
            />
          </div>

          <div>
            <Label>YouTube URL</Label>
            <Input
              value={formData.youtube_url}
              onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="bg-slate-800 border-slate-700"
              required
            />
          </div>

          <div>
            <Label>Schedule Note (optional)</Label>
            <Textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Next stream scheduled for..."
              className="bg-slate-800 border-slate-700 h-24"
            />
          </div>

          <div>
            <Label>Scheduled For (optional)</Label>
            <Input
              type="datetime-local"
              value={formData.scheduled_for}
              onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
              className="bg-slate-800 border-slate-700"
            />
            <p className="text-xs text-slate-500 mt-1">If set to a future time, users will see it as "Upcoming" instead of "Live Now".</p>
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
              className="flex-1 bg-red-500 hover:bg-red-400"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Go Live'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}