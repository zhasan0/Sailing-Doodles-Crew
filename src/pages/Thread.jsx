import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ReportButton from '../components/ReportButton';
import { containsProfanity, PROFANITY_ERROR } from '../utils/contentFilter';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsUp, ArrowLeft, Pencil, Trash2, Pin, Loader2, Image as ImageIcon, Heart, Quote, X } from 'lucide-react';
import { format } from 'date-fns';

export default function Thread({ isInactive = false }) {
  const [user, setUser] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyImageUrl, setReplyImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingThread, setEditingThread] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [quotedReply, setQuotedReply] = useState(null);
  const [blockedEmails, setBlockedEmails] = useState([]);
  const replyFileInputRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const threadId = urlParams.get('id');
  const navigate = useNavigate();
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

  const { data: thread, isLoading } = useQuery({
    queryKey: ['forum-thread', threadId],
    queryFn: async () => {
      const threads = await base44.entities.ForumThread.filter({ id: threadId });
      return threads[0];
    },
    enabled: !!threadId,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['forum-replies', threadId],
    queryFn: () => base44.entities.ForumReply.filter({ thread_id: threadId }, 'created_date'),
    enabled: !!threadId,
  });

  const { data: threadLikes = [] } = useQuery({
    queryKey: ['forum-thread-likes', threadId],
    queryFn: () => base44.entities.ForumLike.filter({ item_type: 'thread', item_id: threadId }),
    enabled: !!threadId,
  });

  const { data: replyLikes = [] } = useQuery({
    queryKey: ['forum-reply-likes', threadId],
    queryFn: async () => {
      const replyIds = replies.map(r => r.id);
      if (replyIds.length === 0) return [];
      const allLikes = await base44.entities.ForumLike.filter({ item_type: 'reply' });
      return allLikes.filter(l => replyIds.includes(l.item_id));
    },
    enabled: replies.length > 0,
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ['forum-follow', threadId],
    queryFn: async () => {
      if (!user) return false;
      const follows = await base44.entities.ForumFollow.filter({ thread_id: threadId, user_email: user.email });
      return follows.length > 0;
    },
    enabled: !!threadId && !!user,
  });

  const toggleFollowMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const follows = await base44.entities.ForumFollow.filter({ thread_id: threadId, user_email: user.email });
        if (follows.length > 0) {
          await base44.entities.ForumFollow.delete(follows[0].id);
        }
      } else {
        await base44.entities.ForumFollow.create({
          thread_id: threadId,
          user_email: user.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-follow', threadId] });
    },
  });

  const handleReplyImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const result = await base44.integrations.Core.UploadFile({ file });
    setReplyImageUrl(result.file_url);
    setUploadingImage(false);
  };

  const createReplyMutation = useMutation({
    mutationFn: async () => {
      if (containsProfanity(replyBody)) throw new Error(PROFANITY_ERROR);
      await base44.entities.ForumReply.create({
        thread_id: threadId,
        body: replyBody,
        author_name: user.display_name || user.full_name,
        author_email: user.email,
        quoted_reply_id: quotedReply?.id,
        image_url: replyImageUrl || undefined,
      });
      await base44.entities.ForumThread.update(threadId, {
        reply_count: (thread.reply_count || 0) + 1,
        last_activity: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies'] });
      queryClient.invalidateQueries({ queryKey: ['forum-thread'] });
      setReplyBody('');
      setReplyImageUrl('');
      setQuotedReply(null);
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ itemType, itemId, currentLikes }) => {
      const userLike = currentLikes.find(l => l.user_email === user.email);
      
      if (userLike) {
        await base44.entities.ForumLike.delete(userLike.id);
        const entity = itemType === 'thread' ? base44.entities.ForumThread : base44.entities.ForumReply;
        const item = itemType === 'thread' ? thread : replies.find(r => r.id === itemId);
        await entity.update(itemId, { like_count: Math.max(0, (item.like_count || 0) - 1) });
      } else {
        await base44.entities.ForumLike.create({
          item_type: itemType,
          item_id: itemId,
          user_email: user.email,
        });
        const entity = itemType === 'thread' ? base44.entities.ForumThread : base44.entities.ForumReply;
        const item = itemType === 'thread' ? thread : replies.find(r => r.id === itemId);
        await entity.update(itemId, { like_count: (item.like_count || 0) + 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-thread-likes'] });
      queryClient.invalidateQueries({ queryKey: ['forum-reply-likes'] });
      queryClient.invalidateQueries({ queryKey: ['forum-thread'] });
      queryClient.invalidateQueries({ queryKey: ['forum-replies'] });
    },
  });

  const updateThreadMutation = useMutation({
    mutationFn: (data) => base44.entities.ForumThread.update(threadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-thread'] });
      setEditingThread(null);
    },
  });

  const deleteThreadMutation = useMutation({
    mutationFn: () => base44.entities.ForumThread.delete(threadId),
    onSuccess: () => {
      navigate(createPageUrl('Forum'));
    },
  });

  const updateReplyMutation = useMutation({
    mutationFn: ({ replyId, body }) => base44.entities.ForumReply.update(replyId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies'] });
      setEditingReply(null);
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId) => {
      await base44.entities.ForumReply.delete(replyId);
      await base44.entities.ForumThread.update(threadId, {
        reply_count: Math.max(0, (thread.reply_count || 0) - 1),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies'] });
      queryClient.invalidateQueries({ queryKey: ['forum-thread'] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: () => base44.entities.ForumThread.update(threadId, { is_pinned: !thread.is_pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-thread'] });
    },
  });

  const canEdit = (item) => {
    if (!user) return false;
    const createdTime = new Date(item.created_date);
    const now = new Date();
    const minutesElapsed = (now - createdTime) / 1000 / 60;
    return item.author_email === user.email && minutesElapsed <= 15;
  };

  const isLiked = (itemType, itemId) => {
    const likes = itemType === 'thread' ? threadLikes : replyLikes;
    return likes.some(l => l.user_email === user?.email && l.item_id === itemId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="px-4 py-6">
        <p className="text-slate-400">Thread not found</p>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-6 pb-20">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl('Forum'))}
        className="mb-4 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Forum
      </Button>

      <Card className="bg-slate-900/50 border-slate-800 mb-6">
        <CardContent className="p-6">
          {editingThread ? (
            <div className="space-y-4">
              <input
                value={editingThread.title}
                onChange={(e) => setEditingThread({ ...editingThread, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
              />
              <Textarea
                value={editingThread.body}
                onChange={(e) => setEditingThread({ ...editingThread, body: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
              />
              <div className="flex gap-2">
                <Button onClick={() => updateThreadMutation.mutate(editingThread)} className="bg-cyan-500 hover:bg-cyan-400">
                  Save
                </Button>
                <Button variant="outline" onClick={() => setEditingThread(null)} className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold text-white">{thread.title}</h1>
                <div className="flex items-center gap-2">
                  {thread.author_email !== user?.email && (
                    <ReportButton
                      itemType="post"
                      itemId={thread.id}
                      itemPreview={thread.title}
                      targetUserEmail={thread.author_email}
                      targetUserName={thread.author_name}
                      currentUserEmail={user?.email}
                      onBlocked={(email) => setBlockedEmails(prev => [...prev, email])}
                    />
                  )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFollowMutation.mutate()}
                      className={isFollowing ? 'text-cyan-400' : 'text-slate-400'}
                    >
                      <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                    </Button>
                    {user?.role === 'admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePinMutation.mutate()}
                        className={thread.is_pinned ? 'text-cyan-400' : 'text-slate-400'}
                      >
                        <Pin className="w-4 h-4" />
                      </Button>
                    )}
                    {canEdit(thread) && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingThread({ title: thread.title, body: thread.body })}
                        className="text-slate-400 hover:text-white"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.confirm('Delete this thread?') && deleteThreadMutation.mutate()}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {user?.role === 'admin' && !canEdit(thread) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.confirm('Delete this thread?') && deleteThreadMutation.mutate()}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-slate-300 whitespace-pre-wrap mb-4">{thread.body}</p>

              {thread.image_url && (
                <img src={thread.image_url} alt="Thread attachment" className="rounded-lg mb-4 max-w-full max-h-96" />
              )}

              {thread.link_url && (
                <a href={thread.link_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 block">
                  🔗 {thread.link_url}
                </a>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="text-slate-500">
                  Posted by <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      navigate(createPageUrl(`MemberProfile?email=${encodeURIComponent(thread.author_email)}`)); 
                    }} 
                    className="text-cyan-400 hover:underline"
                  >
                    {thread.author_name}
                  </button> on {format(new Date(thread.created_date.endsWith('Z') ? thread.created_date : thread.created_date + 'Z'), 'MMM d, yyyy h:mm a')}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLikeMutation.mutate({ itemType: 'thread', itemId: threadId, currentLikes: threadLikes })}
                  className={isLiked('thread', threadId) ? 'text-cyan-400' : 'text-slate-400'}
                >
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  {thread.like_count || 0}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold text-white mb-4">Replies ({replies.length})</h2>

      <div className="space-y-3 mb-6">
        {replies.filter(r => !blockedEmails.includes(r.author_email)).map(reply => (
          <Card key={reply.id} className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              {editingReply?.id === reply.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editingReply.body}
                    onChange={(e) => setEditingReply({ ...editingReply, body: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => updateReplyMutation.mutate({ replyId: reply.id, body: editingReply.body })} className="bg-cyan-500 hover:bg-cyan-400">
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setEditingReply(null)} className="border-slate-700 text-slate-300">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm text-slate-500">
                      <button 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          navigate(createPageUrl(`MemberProfile?email=${encodeURIComponent(reply.author_email)}`)); 
                        }} 
                        className="text-cyan-400 hover:underline font-medium"
                      >
                        {reply.author_name}
                      </button> · {format(new Date(reply.created_date.endsWith('Z') ? reply.created_date : reply.created_date + 'Z'), 'MMM d, h:mm a')}
                    </div>
                    <div className="flex items-center gap-2">
                      <ReportButton
                                    itemType="comment"
                                    itemId={reply.id}
                                    itemPreview={reply.body}
                                    targetUserEmail={reply.author_email}
                                    targetUserName={reply.author_name}
                                    currentUserEmail={user?.email}
                                    onBlocked={(email) => setBlockedEmails(prev => [...prev, email])}
                                  />
                                  <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setQuotedReply(reply)}
                              className="h-7 w-7 text-slate-400 hover:text-cyan-400"
                      >
                        <Quote className="w-3 h-3" />
                      </Button>
                      {canEdit(reply) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingReply({ id: reply.id, body: reply.body })}
                            className="h-7 w-7 text-slate-400 hover:text-white"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.confirm('Delete this reply?') && deleteReplyMutation.mutate(reply.id)}
                            className="h-7 w-7 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLikeMutation.mutate({ itemType: 'reply', itemId: reply.id, currentLikes: replyLikes })}
                        className={isLiked('reply', reply.id) ? 'text-cyan-400' : 'text-slate-400'}
                      >
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        {reply.like_count || 0}
                      </Button>
                    </div>
                  </div>
                  {reply.quoted_reply_id && replies.find(r => r.id === reply.quoted_reply_id) && (
                    <div className="bg-slate-800 border-l-2 border-cyan-400 pl-3 py-2 mb-3 rounded text-sm text-slate-400">
                      <div className="font-medium text-slate-300">{replies.find(r => r.id === reply.quoted_reply_id)?.author_name}</div>
                      <p className="whitespace-pre-wrap">{replies.find(r => r.id === reply.quoted_reply_id)?.body}</p>
                    </div>
                  )}
                  <p className="text-slate-300 whitespace-pre-wrap">{reply.body}</p>
                  {reply.image_url && (
                    <img src={reply.image_url} alt="Reply attachment" className="rounded-lg mt-3 max-w-full max-h-80" />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-3">Add a Reply</h3>
          {quotedReply && (
            <div className="bg-slate-800 border-l-2 border-cyan-400 pl-3 py-2 mb-3 rounded text-sm text-slate-400">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-slate-300">{quotedReply.author_name}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuotedReply(null)}
                  className="h-6 w-6 text-slate-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>
              <p className="whitespace-pre-wrap">{quotedReply.body}</p>
            </div>
          )}
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write your reply..."
            className="bg-slate-800 border-slate-700 text-white mb-3"
          />
          <input
            ref={replyFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleReplyImageUpload}
            className="hidden"
          />
          {replyImageUrl ? (
            <div className="relative inline-block mb-3">
              <img src={replyImageUrl} alt="preview" className="rounded-lg h-28 object-cover" />
              <button
                onClick={() => setReplyImageUrl('')}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => replyFileInputRef.current?.click()}
              disabled={uploadingImage}
              className="mb-3 border-slate-700 text-slate-400 h-8 text-xs"
            >
              {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
              Add Photo
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => createReplyMutation.mutate()}
              disabled={!replyBody.trim() || createReplyMutation.isPending}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400"
            >
              {createReplyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Reply'}
            </Button>
            <Button
              onClick={() => toggleFollowMutation.mutate()}
              disabled={toggleFollowMutation.isPending}
              variant={isFollowing ? "default" : "outline"}
              className={isFollowing ? "bg-cyan-500" : "border-slate-700 text-slate-400"}
            >
              <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
            </Button>
          </div>
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
          Subscribe to Post
        </a>
      )}
    </>
  );
}