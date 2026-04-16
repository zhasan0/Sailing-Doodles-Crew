import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PostCard from '../components/feed/PostCard';
import CommentsSheet from '../components/feed/CommentsSheet';
import { Loader2, Anchor, RefreshCw } from 'lucide-react';
import { containsProfanity, PROFANITY_ERROR } from '../utils/contentFilter';

export default function Feed({ isInactive = false }) {
  const [user, setUser] = useState(null);
  const [blockedEmails, setBlockedEmails] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);

      // Load blocked users (where current user is the blocker)
      const blocked1 = await base44.entities.FriendRequest.filter({ sender_email: userData.email, status: 'blocked' });
      const blocked2 = await base44.entities.FriendRequest.filter({ receiver_email: userData.email, status: 'blocked' });
      const blockedSet = [
        ...blocked1.filter(r => r.blocker_email === userData.email).map(r => r.receiver_email),
        ...blocked2.filter(r => r.blocker_email === userData.email).map(r => r.sender_email),
      ];
      setBlockedEmails(blockedSet);
    };
    loadUser();
  }, []);

  const { data: posts = [], isLoading: postsLoading, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date'),
    staleTime: 2 * 60 * 1000,
  });

  const { data: likes = [] } = useQuery({
    queryKey: ['likes'],
    queryFn: () => base44.entities.Like.list(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments'],
    queryFn: () => base44.entities.Comment.list('-created_date'),
    staleTime: 2 * 60 * 1000,
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked, likeId }) => {
      if (isLiked && likeId) {
        await base44.entities.Like.delete(likeId);
      } else {
        await base44.entities.Like.create({
          post_id: postId,
          user_email: user.email,
        });
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['likes'] });
      const previousLikes = queryClient.getQueryData(['likes']);
      
      queryClient.setQueryData(['likes'], (old = []) => {
        if (isLiked) {
          return old.filter(l => !(l.post_id === postId && l.user_email === user.email));
        } else {
          return [...old, { post_id: postId, user_email: user.email, id: 'temp-' + Date.now() }];
        }
      });
      
      return { previousLikes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['likes'], context.previousLikes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likes'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ text, parentCommentId = null }) => {
      if (containsProfanity(text)) throw new Error(PROFANITY_ERROR);
      await base44.entities.Comment.create({
        post_id: selectedPost.id,
        text,
        author_name: user.display_name || user.full_name || user.email.split('@')[0],
        author_email: user.email,
        parent_comment_id: parentCommentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => base44.entities.Comment.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  const handleLike = (post) => {
    if (!user) return;
    const existingLike = likes.find(l => l.post_id === post.id && l.user_email === user.email);
    likeMutation.mutate({
      postId: post.id,
      isLiked: !!existingLike,
      likeId: existingLike?.id,
    });
  };

  const openComments = (post) => {
    setSelectedPost(post);
    setCommentsOpen(true);
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
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['likes'] }),
        queryClient.invalidateQueries({ queryKey: ['comments'] })
      ]);
      setIsRefreshing(false);
    }
    setPullStartY(0);
    setPullDistance(0);
  };

  useEffect(() => {
    if (!postsLoading && posts.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const postId = params.get('postId');
      if (postId) {
        const post = posts.find(p => p.id === postId);
        if (post) {
          openComments(post);
        }
      }
    }
  }, [postsLoading]);

  const getPostLikes = (postId) => likes.filter(l => l.post_id === postId);
  const getPostComments = (postId) => comments.filter(c => c.post_id === postId);
  const isPostLiked = (postId) => user && likes.some(l => l.post_id === postId && l.user_email === user.email);

  const handleUserBlocked = (email) => {
    setBlockedEmails(prev => [...prev, email]);
  };

  if (postsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const visiblePosts = posts.filter(p => !blockedEmails.includes(p.created_by));

  return (
    <>
      <div 
        ref={scrollContainerRef}
        className="px-4 pt-6 pb-4"
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
        
        <div className={isInactive ? 'blur-sm pointer-events-none' : ''}>
          {visiblePosts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
                <Anchor className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
              <p className="text-slate-500">Check back soon for updates from the crew!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visiblePosts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  likesCount={getPostLikes(post.id).length}
                  commentsCount={getPostComments(post.id).length}
                  isLiked={isPostLiked(post.id)}
                  onLike={() => handleLike(post)}
                  onOpenComments={() => openComments(post)}
                  currentUserEmail={user?.email}
                  onBlocked={handleUserBlocked}
                  priority={index < 2}
                />
              ))}
            </div>
          )}

          <CommentsSheet
            open={commentsOpen}
            onOpenChange={setCommentsOpen}
            comments={selectedPost ? getPostComments(selectedPost.id) : []}
            onAddComment={(text, parentCommentId) => commentMutation.mutateAsync({ text, parentCommentId })}
            onDeleteComment={(id) => deleteCommentMutation.mutate(id)}
            isAdmin={user?.role === 'admin'}
            currentUserEmail={user?.email}
            isSubmitting={commentMutation.isPending}
            blockedEmails={blockedEmails}
          />
        </div>
      </div>
      {isInactive && (
        <div className="px-4 pb-4">
          <a
            href="https://patreon.com/sailingdoodles"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-3 px-4 rounded-xl text-center transition-colors"
          >
            Subscribe to View
          </a>
        </div>
      )}
    </>
  );
}