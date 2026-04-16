import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation, Clock, Loader2, Compass, Anchor } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Location() {
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.LocationUpdate.list('-created_date', 1),
  });

  const currentLocation = locations[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Navigation className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-bold text-white">Where We Are</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Track our current sailing location
        </p>
      </div>

      {currentLocation ? (
        <div className="space-y-4">
          {/* Location Card */}
          <Card className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-800/50 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-1">
                    {currentLocation.location_name}
                  </h2>
                  {currentLocation.latitude && currentLocation.longitude && (
                    <p className="text-cyan-400/80 text-sm font-mono">
                      {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
                    </p>
                  )}
                  {currentLocation.note && (
                    <p className="text-slate-300 mt-3">
                      {currentLocation.note}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cyan-800/30">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-400">
                  Updated {formatDistanceToNow(new Date(currentLocation.updated_date), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Map */}
          {currentLocation.latitude && currentLocation.longitude && (
            <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
              <div className="h-64 relative">
                <MapContainer
                  center={[currentLocation.latitude, currentLocation.longitude]}
                  zoom={10}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
                    <Popup>
                      <div className="font-semibold">{currentLocation.location_name}</div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </Card>
          )}

          {/* Compass decoration */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Compass className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-white text-sm">Sailing Adventure</h3>
                  <p className="text-slate-500 text-xs">
                    Location updates when we have connectivity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
              <Anchor className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Location Coming Soon
            </h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              We'll update our location once we set sail. Stay tuned!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}