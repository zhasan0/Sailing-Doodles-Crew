import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, X } from 'lucide-react';

export default function CreatePostForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    type: 'text',
    title: '',
    body: '',
    media_url: '',
    media_urls: [],
    link_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      // Upload files sequentially to avoid timeout
      const newUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        newUrls.push(result.file_url);
      }
      setFormData(prev => ({ ...prev, media_urls: [...prev.media_urls, ...newUrls] }));
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Some photos failed to upload. Please try fewer at once.');
    }
    setUploading(false);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    setFormData(prev => ({ ...prev, media_urls: prev.media_urls.filter((_, i) => i !== idx) }));
  };

  const convertToYouTubeEmbed = (url) => {
    if (!url || !url.includes('youtu')) return url;
    
    let videoId = null;
    
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
    } else if (url.includes('youtube.com/watch')) {
      const match = url.match(/[?&]v=([^&]+)/);
      if (match) videoId = match[1];
    } else if (url.includes('youtube.com/embed/')) {
      return url; // Already in embed format
    }
    
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const postData = { ...formData };
      
      // Convert YouTube URLs to embed format before saving
      if (postData.type === 'video' && postData.media_url) {
        postData.media_url = convertToYouTubeEmbed(postData.media_url);
      }
      
      await base44.entities.Post.create(postData);
      await base44.entities.Notification.create({
        type: 'new_post',
        title: 'New Post',
        message: formData.title,
        for_all: true,
      });
      setFormData({ type: 'text', title: '', body: '', media_url: '', media_urls: [], link_url: '' });
      onSuccess();
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  return (
    <Card className="bg-card border">
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Post Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Update</SelectItem>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="h-24"
            />
          </div>

          {formData.type === 'photo' && (
            <div>
              <Label>Photos (up to 5 at a time)</Label>
              <div className="space-y-3">
                {formData.media_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {formData.media_urls.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-800">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {formData.media_urls.length < 10 && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button type="button" variant="outline" className="w-full" disabled={uploading} asChild>
                        <span>
                          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                          {uploading ? 'Uploading...' : 'Add Photos'}
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.type === 'video' && (
            <div>
              <Label>YouTube Video URL</Label>
              <Input
                value={formData.media_url}
                onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          )}

          {formData.type === 'link' && (
            <div>
              <Label>Link URL</Label>
              <Input
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-cyan-500 hover:bg-cyan-400"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create Post
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}