import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, MessageSquare, ThumbsUp, Pin, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import CreateThreadDialog from '../components/forum/CreateThreadDialog';

export default function Forum({ isInactive = false }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [blockedEmails, setBlockedEmails] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = React.useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const [b1, b2] = await Promise.all([
        base44.entities.FriendRequest.filter({ sender_email: userData.email, status: 'blocked' }),
        base44.entities.FriendRequest.filter({ receiver_email: userData.email, status: 'blocked' }),
      ]);
      const blocked = [
        ...b1.filter(r => r.blocker_email === userData.email).map(r => r.receiver_email),
        ...b2.filter(r => r.blocker_email === userData.email).map(r => r.sender_email),
      ];
      setBlockedEmails(blocked);
    };
    loadUser();
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: () => base44.entities.ForumCategory.list('order'),
  });

  const { data: threads = [], isLoading, refetch } = useQuery({
    queryKey: ['forum-threads', selectedCategory, sortBy, searchQuery],
    queryFn: async () => {
      let allThreads = await base44.entities.ForumThread.list('-last_activity');
      
      // Filter by category
      if (selectedCategory !== 'all') {
        allThreads = allThreads.filter(t => t.category_id === selectedCategory);
      }
      
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        allThreads = allThreads.filter(t => 
          t.title.toLowerCase().includes(query) || 
          t.body.toLowerCase().includes(query)
        );
      }
      
      // Sort
      if (sortBy === 'recent') {
        allThreads.sort((a, b) => new Date(b.last_activity || b.created_date) - new Date(a.last_activity || a.created_date));
      } else if (sortBy === 'newest') {
        allThreads.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      } else if (sortBy === 'liked') {
        allThreads.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
      }
      
      // Separate pinned and regular threads
      const pinned = allThreads.filter(t => t.is_pinned);
      const regular = allThreads.filter(t => !t.is_pinned);
      
      // Filter blocked users
      const filtered = [...pinned, ...regular];
      return filtered;
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async (data) => {
      const thread = await base44.entities.ForumThread.create({
        ...data,
        author_name: user.display_name || user.full_name,
        author_email: user.email,
        last_activity: new Date().toISOString(),
      });
      return thread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-threads'] });
      setShowCreateDialog(false);
    },
  });

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

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
      await refetch();
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
    <>
      <div 
        ref={scrollContainerRef}
        className="px-4 py-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
        }}
      >
        {/* Pull-to-refresh indicator */}
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
          <h1 className="text-2xl font-bold text-white">Forum</h1>
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={isInactive}
            className={`h-12 ${isInactive ? 'bg-slate-700 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-400'}`}
          >
            <Plus className="w-5 h-5 mr-2" />
            New Thread
          </Button>
        </div>

      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threads..."
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>

        <div className="flex gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-12">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="recent">Recent Activity</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="liked">Most Liked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {threads.filter(t => !blockedEmails.includes(t.author_email)).length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-12 text-center">
              <p className="text-slate-400">No threads found. Start a discussion!</p>
            </CardContent>
          </Card>
        ) : (
          threads.filter(t => !blockedEmails.includes(t.author_email)).map(thread => (
            <Link key={thread.id} to={createPageUrl(`Thread?id=${thread.id}`)}>
              <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {thread.is_pinned && (
                          <Pin className="w-3 h-3 text-cyan-400" />
                        )}
                        <h3 className="text-white font-semibold truncate">{thread.title}</h3>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-2">{thread.body}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                       <span className="text-slate-400">{getCategoryName(thread.category_id)}</span>
                       <button onClick={(e) => { e.preventDefault(); navigate(createPageUrl(`MemberProfile?email=${encodeURIComponent(thread.author_email)}`)); }} className="text-cyan-400 hover:underline">by {thread.author_name}</button>
                       <span>{(() => {
                         try {
                           const d = thread.created_date;
                           return format(new Date(d.endsWith('Z') ? d : d + 'Z'), 'MMM d, yyyy');
                         } catch {
                           return 'Invalid date';
                         }
                       })()}</span>
                       <div className="flex items-center gap-1">
                         <MessageSquare className="w-3 h-3" />
                         <span>{thread.reply_count || 0}</span>
                       </div>
                       <div className="flex items-center gap-1">
                         <ThumbsUp className="w-3 h-3" />
                         <span>{thread.like_count || 0}</span>
                       </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

        <CreateThreadDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSubmit={(data) => createThreadMutation.mutate(data)}
          categories={categories}
          isSubmitting={createThreadMutation.isPending}
        />
      </div>
      {isInactive && (
        <a
          href="https://patreon.com/sailingdoodles"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto pointer-events-auto z-50 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-3 px-4 rounded-xl text-center transition-colors"
        >
          Subscribe to Post
        </a>
      )}
    </>
  );
}