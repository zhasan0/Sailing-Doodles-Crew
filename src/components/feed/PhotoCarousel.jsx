import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PhotoCarousel({ urls }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState({});
  const touchStartX = useRef(null);

  if (!urls || urls.length === 0) return null;

  const prev = () => setIndex(i => (i - 1 + urls.length) % urls.length);
  const next = () => setIndex(i => (i + 1) % urls.length);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden mb-4 bg-slate-800 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {urls.map((url, i) => (
          <div key={i} className="min-w-full relative">
            {!loaded[i] && (
              <div className="absolute inset-0 flex items-center justify-center min-h-[200px]">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              className={`w-full h-auto max-h-[500px] object-contain transition-opacity ${loaded[i] ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(l => ({ ...l, [i]: true }))}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchpriority={i === 0 ? 'high' : 'low'}
            />
          </div>
        ))}
      </div>

      {urls.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {index + 1}/{urls.length}
          </div>
        </>
      )}
    </div>
  );
}