import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Image, X } from 'lucide-react';

export default function CreateThreadDialog({ open, onClose, onSubmit, categories, isSubmitting }) {
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    body: '',
    image_url: '',
    link_url: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: result.file_url });
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploadingImage(false);
  };

  const handleSubmit = () => {
    if (!formData.category_id || !formData.title || !formData.body) return;
    onSubmit(formData);
    setFormData({ category_id: '', title: '', body: '', image_url: '', link_url: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Thread</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Category</Label>
            <Select value={formData.category_id} onValueChange={(val) => setFormData({ ...formData, category_id: val })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Thread title..."
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-slate-300">Body</Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Write your post..."
              className="bg-slate-800 border-slate-700 text-white mt-1 min-h-[150px]"
            />
          </div>

          <div>
            <Label className="text-slate-300">Image (Optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {formData.image_url ? (
              <div className="mt-2 relative inline-block">
                <img src={formData.image_url} alt="preview" className="rounded-lg h-32 object-cover" />
                <button
                  onClick={() => setFormData({ ...formData, image_url: '' })}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="mt-1 border-slate-700 text-slate-300"
              >
                {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4 mr-2" />}
                Upload Image
              </Button>
            )}
          </div>

          <div>
            <Label className="text-slate-300">Link (Optional)</Label>
            <Input
              value={formData.link_url}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              placeholder="https://..."
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.category_id || !formData.title || !formData.body || isSubmitting}
              className="bg-cyan-500 hover:bg-cyan-400"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Thread'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}