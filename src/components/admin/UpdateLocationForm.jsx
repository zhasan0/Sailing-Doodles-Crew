import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, MapPin } from 'lucide-react';

export default function UpdateLocationForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    location_name: '',
    latitude: '',
    longitude: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchResults([]);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`
      );
      const results = await response.json();
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    }
    setSearching(false);
  };

  const selectLocation = (result) => {
    setFormData({
      ...formData,
      location_name: result.display_name.split(',')[0],
      latitude: result.lat,
      longitude: result.lon,
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        location_name: formData.location_name,
        note: formData.note,
      };
      if (formData.latitude) data.latitude = parseFloat(formData.latitude);
      if (formData.longitude) data.longitude = parseFloat(formData.longitude);
      
      await base44.entities.LocationUpdate.create(data);
      setFormData({ location_name: '', latitude: '', longitude: '', note: '' });
      onSuccess();
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Update Location</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location Search */}
          <div>
            <Label className="text-slate-300">Search Location</Label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                placeholder="Search: Koh Samui, Caribbean Sea, etc."
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="bg-slate-700 hover:bg-slate-600"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectLocation(result)}
                    className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                      <div className="text-sm text-slate-300">{result.display_name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 pt-4">
            <Label className="text-slate-300">Location Name</Label>
            <Input
              value={formData.location_name}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              placeholder="Koh Samui - Chaweng Bay"
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Latitude</Label>
              <Input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="9.2277"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Longitude</Label>
              <Input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="100.0377"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Note (Optional)</Label>
            <Textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Anchored near the beach, great swimming spot!"
              className="bg-slate-800 border-slate-700 text-white h-20"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-cyan-500 hover:bg-cyan-400"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Update Location
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}