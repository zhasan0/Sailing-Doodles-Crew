import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import SchedulePicker from './SchedulePicker';

export default function UpdateLivestreamForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    youtube_url: '',
    note: '',
    scheduled_for: '',
  });
  const [currentStream, setCurrentStream] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCurrentStream();
  }, []);

  const loadCurrentStream = async () => {
    try {
      const streams = await base44.entities.Livestream.filter({ is_active: true }, '-updated_date', 1);
      if (streams && streams[0]) {
        setCurrentStream(streams[0]);
        setFormData({
          title: streams[0].title || '',
          youtube_url: streams[0].youtube_url || '',
          note: streams[0].note || '',
          scheduled_for: streams[0].scheduled_for ? streams[0].scheduled_for.slice(0, 16) : '',
        });
      }
    } catch (err) {
      console.error('Failed to load livestream:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (currentStream) {
        await base44.entities.Livestream.update(currentStream.id, formData);
      } else {
        await base44.entities.Livestream.create({ ...formData, is_active: true });
      }
      await base44.entities.Notification.create({
        type: 'livestream_update',
        title: 'Livestream Updated',
        message: formData.title,
        link: '/Livestreams',
        for_all: true,
      });
      onSuccess();
      loadCurrentStream();
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-32">
      <Card className="bg-card border">
        <CardHeader>
          <CardTitle>Update Livestream</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>YouTube URL</Label>
            <Input
              value={formData.youtube_url}
              onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          </div>

          <div>
            <Label>Schedule Note (Optional)</Label>
            <Textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Live every Saturday at 7pm EST"
              className="h-20"
            />
          </div>

          <div>
            <Label>Scheduled For (Optional)</Label>
            <SchedulePicker
              value={formData.scheduled_for}
              onChange={(val) => setFormData({ ...formData, scheduled_for: val })}
            />
            <p className="text-xs text-muted-foreground mt-1">If set to a future time, users will see it as "Upcoming" instead of "Live Now".</p>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-cyan-500 hover:bg-cyan-400"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {currentStream ? 'Update' : 'Create'} Livestream
          </Button>
        </form>
        </CardContent>
      </Card>
    </div>
  );
}