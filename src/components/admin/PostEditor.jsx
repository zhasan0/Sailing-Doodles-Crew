import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MobileSelect, MobileSelectTrigger, MobileSelectContent, MobileSelectItem, MobileSelectPrimitive } from '@/components/ui/mobile-select';
import { Loader2, Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PostEditor({ open, onOpenChange, post, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    type: 'text',
    title: '',
    body: '',
    media_url: '',
    media_urls: [],
    link_url: '',
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (post) {
      setFormData({
        type: post.type || 'text',
        title: post.title || '',
        body: post.body || '',
        media_url: post.media_url || '',
        media_urls: post.media_urls || [],
        link_url: post.link_url || '',
      });
    } else {
      setFormData({ type: 'text', title: '', body: '', media_url: '', media_urls: [], link_url: '' });
    }
  }, [post, open]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const uploaded = await Promise.all(files.map(file => base44.integrations.Core.UploadFile({ file })));
    const newUrls = uploaded.map(r => r.file_url);
    setFormData(prev => ({ ...prev, media_urls: [...prev.media_urls, ...newUrls] }));
    setUploading(false);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    setFormData(prev => ({ ...prev, media_urls: prev.media_urls.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{post ? 'Edit Post' : 'Create Post'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Post Type</Label>
            <MobileSelect value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <MobileSelectTrigger className="bg-slate-800 border-slate-700">
                <MobileSelectPrimitive.Value />
              </MobileSelectTrigger>
              <MobileSelectContent className="bg-slate-800 border-slate-700">
                <MobileSelectItem value="text">Text Update</MobileSelectItem>
                <MobileSelectItem value="photo">Photo</MobileSelectItem>
                <MobileSelectItem value="video">Video</MobileSelectItem>
                <MobileSelectItem value="link">Link</MobileSelectItem>
              </MobileSelectContent>
            </MobileSelect>
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Post title..."
              className="bg-slate-800 border-slate-700"
              required
            />
          </div>

          <div>
            <Label>Content</Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Write your post content..."
              className="bg-slate-800 border-slate-700 h-32"
            />
          </div>

          {formData.type === 'photo' && (
            <div>
              <Label>Photos</Label>
              <div className="space-y-3">
                {formData.media_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {formData.media_urls.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-700">
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
                    <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" id="pe-file-upload" />
                    <label htmlFor="pe-file-upload">
                      <Button type="button" variant="outline" className="w-full border-slate-700" disabled={uploading} asChild>
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
              <Label>Media URL</Label>
              <Input
                value={formData.media_url}
                onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                placeholder="YouTube URL..."
                className="bg-slate-800 border-slate-700"
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
                className="bg-slate-800 border-slate-700"
              />
            </div>
          )}

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
                post ? 'Update' : 'Create'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}