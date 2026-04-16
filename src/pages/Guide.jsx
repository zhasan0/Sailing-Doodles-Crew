import React from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Guide({ isInactive = false }) {
  const mapUrl = "https://www.google.com/maps/d/embed?mid=1BeMAbSmyDkIg6bXL6_2ZZVbW2DupZKE";
  const editUrl = "https://www.google.com/maps/d/u/0/edit?mid=1BeMAbSmyDkIg6bXL6_2ZZVbW2DupZKE&usp=sharing";

  return (
    <>
      <div className={`p-4 space-y-4 ${isInactive ? 'blur-sm pointer-events-none' : ''}`}>
        {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Cruising Guide</h1>
            <p className="text-sm text-slate-400">Reviews & Anchorages</p>
          </div>
        </div>
        <a href={editUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2 bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
            <ExternalLink className="w-4 h-4" />
            Open
          </Button>
        </a>
      </div>

      {/* Map */}
      <Card className="overflow-hidden bg-slate-900 border-slate-800">
        <iframe
          src={mapUrl}
          width="100%"
          height="600"
          style={{ border: 0 }}
          loading="lazy"
          className="w-full"
        />
      </Card>

        {/* Info */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <p className="text-sm text-slate-300">
            Explore our curated collection of anchorages, marinas, and points of interest. 
            Click markers on the map for detailed reviews and information.
          </p>
        </div>
      </div>
      {isInactive && (
        <a
          href="https://patreon.com/sailingdoodles"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto pointer-events-auto z-50 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-3 px-4 rounded-xl text-center transition-colors"
        >
          Subscribe to View
        </a>
      )}
    </>
  );
}