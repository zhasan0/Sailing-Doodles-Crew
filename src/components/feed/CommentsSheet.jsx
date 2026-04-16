import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Trash2 } from 'lucide-react';
import ReportButton from '../ReportButton';
import { formatDistanceToNow } from 'date-fns';

export default function CommentsSheet({ 
  open, 
  onOpenChange, 
  comments, 
  onAddComment, 
  onDeleteComment,
  isAdmin,
  currentUserEmail,
  isSubmitting,
  blockedEmails = [],
}) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await onAddComment(newComment, replyingTo);
    setNewComment('');
    setReplyingTo(null);
  };

  // Organize comments into threads (parent comments and their replies)
  const mainComments = comments.filter(c => !c.parent_comment_id && !blockedEmails.includes(c.author_email));
  const getReplies = (commentId) => comments.filter(c => c.parent_comment_id === commentId && !blockedEmails.includes(c.author_email));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] bg-slate-900 border-slate-800 rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-slate-800">
          <SheetTitle className="text-white">
            Comments ({comments.length})
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100%-140px)] py-4">
          {comments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No comments yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mainComments.map((comment) => {
                const replies = getReplies(comment.id);
                const isReplyingTo = replyingTo === comment.id;
                
                return (
                  <div key={comment.id}>
                    {/* Main comment */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white">
                          {(comment.author_name || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">
                              {comment.author_name || 'Member'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                          {(isAdmin || comment.author_email === currentUserEmail) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-500 hover:text-red-400"
                              onClick={() => onDeleteComment(comment.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                          <ReportButton
                            itemType="comment"
                            itemId={comment.id}
                            itemPreview={comment.text}
                            targetUserEmail={comment.author_email}
                            targetUserName={comment.author_name}
                            currentUserEmail={currentUserEmail}
                          />
                          </div>
                        </div>
                        <p className="text-slate-300 text-sm mt-1">{comment.text}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-cyan-400 hover:text-cyan-300 h-6 px-2 mt-2"
                          onClick={() => setReplyingTo(isReplyingTo ? null : comment.id)}
                        >
                          {isReplyingTo ? 'Cancel' : 'Reply'}
                        </Button>
                      </div>
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="ml-8 mt-3 space-y-3 border-l border-slate-700 pl-4">
                        {replies.map((reply) => (
                          <div key={reply.id} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-white">
                                {(reply.author_name || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-white text-sm">
                                    {reply.author_name || 'Member'}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                {(isAdmin || reply.author_email === currentUserEmail) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-500 hover:text-red-400"
                                    onClick={() => onDeleteComment(reply.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                                <ReportButton
                                  itemType="comment"
                                  itemId={reply.id}
                                  itemPreview={reply.text}
                                  targetUserEmail={reply.author_email}
                                  targetUserName={reply.author_name}
                                  currentUserEmail={currentUserEmail}
                                />
                                </div>
                              </div>
                              <p className="text-slate-300 text-sm mt-1">{reply.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    {isReplyingTo && (
                      <div className="ml-8 mt-3 flex gap-2">
                        <Input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={`Reply to ${comment.author_name}...`}
                          className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-8 text-sm"
                        />
                        <Button
                          disabled={!newComment.trim() || isSubmitting}
                          onClick={handleSubmit}
                          className="bg-cyan-500 hover:bg-cyan-400 h-8 px-3"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {!replyingTo && (
          <form onSubmit={handleSubmit} className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
              <Button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="bg-cyan-500 hover:bg-cyan-400"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}