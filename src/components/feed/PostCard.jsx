import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, ExternalLink, Play, Image as ImageIcon, FileText, Link as LinkIcon } from 'lucide-react';
import ReportButton from '../ReportButton';
import { formatDistanceToNow } from 'date-fns';
import PhotoCarousel from './PhotoCarousel';

const typeIcons = {
  text: FileText,
  photo: ImageIcon,
  video: Play,
  link: LinkIcon,
};

const typeColors = {
  text: 'bg-violet-500/20 text-violet-400',
  photo: 'bg-emerald-500/20 text-emerald-400',
  video: 'bg-red-500/20 text-red-400',
  link: 'bg-amber-500/20 text-amber-400',
};



export default function PostCard({ 
  post, 
  likesCount, 
  commentsCount, 
  isLiked, 
  onLike, 
  onOpenComments,
  currentUserEmail,
  onBlocked,
  priority = false,
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const TypeIcon = typeIcons[post.type] || FileText;

  return (
    <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
      {/* Post Type Badge */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[post.type]}`}>
          <TypeIcon className="w-3 h-3" />
          {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{post.created_date ? formatDistanceToNow(new Date(post.created_date.endsWith('Z') ? post.created_date : post.created_date + 'Z'), { addSuffix: true }) : 'now'}</span>
        <ReportButton
          itemType="post"
          itemId={post.id}
          itemPreview={post.title}
          targetUserEmail={post.created_by}
          targetUserName={post.created_by}
          currentUserEmail={currentUserEmail}
          onBlocked={onBlocked}
        />
        </div>
      </div>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-2">{post.title}</h3>

        {/* Body */}
        {post.body && (
          <p className="text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
            {post.body}
          </p>
        )}

        {/* Media */}
        {post.type === 'photo' && (
          post.media_urls?.length > 0
            ? <PhotoCarousel urls={post.media_urls} />
            : post.media_url
              ? (
                <div className="relative rounded-xl overflow-hidden mb-4 bg-slate-800">
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <img
                    src={post.media_url}
                    alt={post.title}
                    className={`w-full h-auto transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                    loading={priority ? 'eager' : 'lazy'}
                    fetchpriority={priority ? 'high' : 'low'}
                  />
                </div>
              )
              : null
        )}

{post.type === 'video' && post.media_url && (
  <div className="mb-4 aspect-video bg-slate-800 rounded-xl overflow-hidden">
    <iframe
      className="w-full h-full"
      src={post.media_url}
      title={post.title}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  </div>
)}

        {post.type === 'link' && post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500/50 transition-colors mb-4"
          >
            <ExternalLink className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm truncate">{post.link_url}</span>
          </a>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isLiked ? 'text-red-400 hover:text-red-300' : 'text-slate-400 hover:text-white'}`}
            onClick={onLike}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-400 hover:text-white"
            onClick={onOpenComments}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{commentsCount}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}