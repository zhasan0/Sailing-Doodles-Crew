import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, Clock, Calendar, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function Livestreams({ isInactive = false }) {
  const { data: livestreams = [], isLoading } = useQuery({
    queryKey: ['livestreams'],
    queryFn: () => base44.entities.Livestream.filter({ is_active: true }, '-updated_date', 1),
  });

  const currentStream = livestreams[0];

  const parseScheduled = (sf) => {
    if (!sf) return null;
    return new Date(sf);
  };

  const formatAsET = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date) + ' ET';
  };

  const isUpcoming = (stream) => {
    if (!stream?.scheduled_for) return false;
    const d = parseScheduled(stream.scheduled_for);
    return d && d > new Date();
  };

  const isEnded = (stream) => {
    if (!stream?.scheduled_for) return false;
    const d = parseScheduled(stream.scheduled_for);
    // Consider ended if scheduled time was more than 6 hours ago
    return d && d < new Date(Date.now() - 6 * 60 * 60 * 1000);
  };

  const getYoutubeVideoId = (url) => {
    if (!url) return null;
    // Handle /live/, /watch?v=, /embed/, youtu.be/ formats
    const match = url.match(/(?:youtube\.com\/(?:live\/|(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const getYoutubeEmbedUrl = (url) => {
    const videoId = getYoutubeVideoId(url);
    if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
    return url;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <>
      <div className={`px-4 py-6 ${isInactive ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-5 h-5 text-red-500" />
            <h1 className="text-xl font-bold text-white">Livestreams</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Watch live broadcasts from the sailing crew
          </p>
        </div>

        {currentStream ? (
        <div className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
            {isUpcoming(currentStream) ? (
              <div className="aspect-video bg-slate-800 relative">
                {getYoutubeVideoId(currentStream.youtube_url) ? (
                  <a href={currentStream.youtube_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                    <img
                      src={`https://img.youtube.com/vi/${getYoutubeVideoId(currentStream.youtube_url)}/hqdefault.jpg`}
                      alt={currentStream.title}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-slate-600" />
                  </div>
                )}
              </div>
            ) : (
              // Live Now: show thumbnail with play button linking to YouTube (iframes often blocked)
              <div className="aspect-video bg-slate-800 relative">
                {getYoutubeVideoId(currentStream.youtube_url) ? (
                  <a
                    href={currentStream.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full relative group"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${getYoutubeVideoId(currentStream.youtube_url)}/hqdefault.jpg`}
                      alt={currentStream.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Watch on YouTube
                    </div>
                  </a>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Radio className="w-10 h-10 text-slate-600" />
                  </div>
                )}
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                {isUpcoming(currentStream) ? (
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-0">
                    <Calendar className="w-3 h-3 mr-1.5" />
                    Upcoming · {formatAsET(parseScheduled(currentStream.scheduled_for))}
                  </Badge>
                ) : isEnded(currentStream) ? (
                  <Badge className="bg-slate-500/20 text-slate-400 border-0">
                    <Clock className="w-3 h-3 mr-1.5" />
                    Stream Ended
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-0">
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" />
                    Live Now
                  </Badge>
                )}
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                {currentStream.title}
              </h2>
              {currentStream.note && (
                <p className="text-slate-400 text-sm mb-4">
                  {currentStream.note}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Updated {format(new Date(currentStream.updated_date), 'MMM d, h:mm a')}</span>
                </div>
                <a
                  href={currentStream.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  {isUpcoming(currentStream) ? 'Watch on YouTube' : 'Open Stream'}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
              <Radio className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No Active Livestream
            </h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              There's no live broadcast at the moment. Check back later or enable notifications to know when we go live!
            </p>
          </CardContent>
        </Card>
      )}

        <Card className="bg-slate-900/50 border-slate-800 mt-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-white">Schedule</h3>
            </div>
            <p className="text-slate-400 text-sm">
              Livestreams happen spontaneously based on sailing conditions and connectivity. 
              Turn on notifications to get alerted when a new stream starts!
            </p>
          </CardContent>
        </Card>
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