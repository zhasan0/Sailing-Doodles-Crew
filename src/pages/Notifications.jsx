import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Radio, FileText, MessageCircle, CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

const typeConfig = {
  new_post: { icon: FileText, color: 'text-violet-400', bg: 'bg-violet-500/20' },
  livestream_update: { icon: Radio, color: 'text-red-400', bg: 'bg-red-500/20' },
  comment: { icon: MessageCircle, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  system: { icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/20' },
};

export default function Notifications() {
  const [user, setUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = React.useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date'),
  });

  const { data: reads = [] } = useQuery({
    queryKey: ['notificationReads', user?.email],
    queryFn: () => base44.entities.NotificationRead.filter({ user_email: user?.email }),
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.NotificationRead.create({
        notification_id: notificationId,
        user_email: user.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationReads'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const readIds = new Set(reads.map(r => r.notification_id));
      const unread = notifications.filter(n => !readIds.has(n.id));
      await Promise.all(
        unread.map(n => 
          base44.entities.NotificationRead.create({
            notification_id: n.id,
            user_email: user.email,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationReads'] });
    },
  });

  const readIds = new Set(reads.map(r => r.notification_id));
  const filteredNotifications = notifications.filter(n => n.for_all || n.for_user === user?.email);
  const unreadCount = filteredNotifications.filter(n => !readIds.has(n.id)).length;

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    if (scrollContainerRef.current?.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (pullStartY === 0 || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY;
    
    if (distance > 0 && scrollContainerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['notificationReads'] })
      ]);
      setIsRefreshing(false);
    }
    setPullStartY(0);
    setPullDistance(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="px-4 py-6 h-[calc(100vh-8rem)] overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain'
      }}
    >
      {pullDistance > 0 && (
        <div 
          className="flex justify-center items-center py-2 transition-opacity"
          style={{ 
            opacity: Math.min(pullDistance / 60, 1),
            transform: `translateY(${pullDistance}px)`,
            marginTop: -pullDistance
          }}
        >
          <RefreshCw className={`w-5 h-5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 text-sm">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-cyan-400 hover:text-cyan-300"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {filteredNotifications.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
              <Bell className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No notifications yet
            </h3>
            <p className="text-slate-500 text-sm">
              You'll see updates here when there's new content
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const isRead = readIds.has(notification.id);
            const config = typeConfig[notification.type] || typeConfig.system;
            const Icon = config.icon;

            const content = (
              <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium mb-1 ${isRead ? 'text-slate-400' : 'text-white'}`}>
                    {notification.title}
                  </h3>
                  <p className={`text-sm ${isRead ? 'text-slate-500' : 'text-slate-400'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );

            const cardClassName = `border-slate-800 transition-colors cursor-pointer hover:border-slate-700 ${
              isRead ? 'bg-slate-900/30' : 'bg-slate-900/70 border-l-2 border-l-cyan-500'
            }`;

            // Determine the link based on notification type or explicit link
            let pageLink = notification.link;
            if (!pageLink) {
              const typePages = {
                new_post: 'Feed',
                livestream_update: 'Livestreams',
                comment: 'Feed',
              };
              pageLink = typePages[notification.type];
            }

            if (pageLink) {
              let link = pageLink.startsWith('/') ? pageLink.slice(1) : pageLink;
              const hasParams = link.includes('?');
              if (hasParams) {
                const [pageName, params] = link.split('?');
                link = createPageUrl(pageName) + '?' + params;
              } else {
                link = createPageUrl(link);
              }
              return (
                <Link key={notification.id} to={link} onClick={() => !isRead && markReadMutation.mutate(notification.id)}>
                  <Card className={cardClassName}>
                    <CardContent className="p-4">
                      {content}
                    </CardContent>
                  </Card>
                </Link>
              );
            }

            return (
              <Card
                key={notification.id}
                className={cardClassName}
                onClick={() => !isRead && markReadMutation.mutate(notification.id)}
              >
                <CardContent className="p-4">
                  {content}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}