import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Image, X, AlertCircle, Flag, UserX, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { containsProfanity, PROFANITY_ERROR } from '../utils/contentFilter';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import OnlineUsers from '@/components/chat/OnlineUsers';

export default function ChatRoom({ isInactive = false }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);

  const [isBanned, setIsBanned] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [blockedEmails, setBlockedEmails] = useState([]);
  const [reportDialog, setReportDialog] = useState({ open: false, messageId: null });
  const [reportReason, setReportReason] = useState('');

  const REPORT_REASONS = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'misinformation', label: 'Misinformation' },
    { value: 'other', label: 'Other' },
  ];
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const composerRef = useRef(null);
  const PAGE_SIZE = 50;

  // iOS keyboard: adjust bottom padding when visualViewport shrinks
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      if (!composerRef.current) return;
      const windowHeight = window.innerHeight;
      const viewportHeight = vv.height;
      const keyboardHeight = windowHeight - viewportHeight - vv.offsetTop;
      composerRef.current.style.paddingBottom = keyboardHeight > 50
        ? `${keyboardHeight}px`
        : '';
    };

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // Load blocked emails
        const [bk1, bk2] = await Promise.all([
          base44.entities.FriendRequest.filter({ sender_email: userData.email, status: 'blocked' }),
          base44.entities.FriendRequest.filter({ receiver_email: userData.email, status: 'blocked' }),
        ]);
        const blocked = [
          ...bk1.filter(r => r.blocker_email === userData.email).map(r => r.receiver_email),
          ...bk2.filter(r => r.blocker_email === userData.email).map(r => r.sender_email),
        ];
        setBlockedEmails(blocked);

        // Check if banned
        const bans = await base44.entities.UserBan.filter({ user_email: userData.email });
        if (bans.length > 0) {
          setIsBanned(true);
          setLoading(false);
          return;
        }

        // Check if muted
        const mutes = await base44.entities.UserMute.filter({ user_email: userData.email });
        const now = Date.now();
        const activeMute = mutes.find(m => {
          if (!m.muted_until) return true;
          const muteDate = new Date(m.muted_until).getTime();
          return !isNaN(muteDate) && muteDate > now;
        });
        setIsMuted(!!activeMute);
        
        // Load the chat room
        const rooms = await base44.entities.ChatRoom.list('order');
        const chatRoom = rooms[0];
        setRoom(chatRoom);
        
        if (chatRoom) {
          await loadMessages(chatRoom.id);
        }
        
        // Load all users for @mention
        const users = await base44.entities.User.list();
        setAllUsers(users);
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load chat:', err);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const loadMessages = async (roomId, append = false) => {
    const offset = append ? messages.length : 0;
    const msgs = await base44.entities.ChatMessage.filter(
      { room_id: roomId },
      '-created_date',
      PAGE_SIZE,
      offset
    );

    if (append) {
      // Older messages go to end of array — renders at TOP with flex-col-reverse
      setMessages(prev => [...prev, ...msgs]);
      setHasMore(msgs.length === PAGE_SIZE);
    } else {
      // Newest first — flex-col-reverse naturally starts at bottom, no scroll needed
      setMessages(msgs);
      setHasMore(msgs.length === PAGE_SIZE);
    }
  };



  useEffect(() => {
    if (!room) return;
    
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.room_id !== room.id) return;
      
      if (event.type === 'create') {
        // Prepend to front so it appears at bottom with flex-col-reverse
        setMessages(prev => {
          // Replace optimistic temp message if it matches
          const filtered = prev.filter(m => !m.id.startsWith('temp-'));
          return [event.data, ...filtered];
        });
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    
    return unsubscribe;
  }, [room]);

  // Track user presence and count online users
  useEffect(() => {
    if (!room || !user) return;

    const updatePresence = async () => {
      try {
        const existing = await base44.entities.ChatMessageRead.filter({
          room_id: room.id,
          user_email: user.email
        });

        if (existing.length > 0) {
          await base44.entities.ChatMessageRead.update(existing[0].id, {
            last_read_at: new Date().toISOString()
          });
        } else {
          await base44.entities.ChatMessageRead.create({
            room_id: room.id,
            user_email: user.email,
            last_read_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Failed to update presence:', err);
      }
    };

    const countOnlineUsers = async () => {
      try {
        const allPresence = await base44.entities.ChatMessageRead.filter({
          room_id: room.id
        });
        
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const online = allPresence.filter(p => 
          new Date(p.last_read_at) > twoMinutesAgo
        );
        
        setOnlineCount(online.length);
      } catch (err) {
        console.error('Failed to count online users:', err);
      }
    };

    // Initial update
    updatePresence();
    countOnlineUsers();

    // Update presence every 30 seconds
    const presenceInterval = setInterval(updatePresence, 30000);
    
    // Count online users every 10 seconds
    const countInterval = setInterval(countOnlineUsers, 10000);

    return () => {
      clearInterval(presenceInterval);
      clearInterval(countInterval);
    };
  }, [room, user]);



  const handleScroll = async (e) => {
    // With flex-col-reverse, scrollTop=0 is the bottom; scrollTop at most negative is the top
    const el = e.target;
    const atTop = el.scrollTop + el.scrollHeight - el.clientHeight < 10;
    if (atTop && hasMore && !loadingMore) {
      setLoadingMore(true);
      await loadMessages(room.id, true);
      setLoadingMore(false);
    }
  };

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    const scrollTop = messagesContainerRef.current?.scrollTop || 0;
    const scrollHeight = messagesContainerRef.current?.scrollHeight || 0;
    const clientHeight = messagesContainerRef.current?.clientHeight || 0;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
    
    if (isAtBottom) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (pullStartY === 0 || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = pullStartY - currentY; // Inverted for bottom pull
    
    const scrollTop = messagesContainerRef.current?.scrollTop || 0;
    const scrollHeight = messagesContainerRef.current?.scrollHeight || 0;
    const clientHeight = messagesContainerRef.current?.clientHeight || 0;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
    
    if (distance > 0 && isAtBottom) {
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing && room) {
      setIsRefreshing(true);
      await loadMessages(room.id);
      setIsRefreshing(false);
    }
    setPullStartY(0);
    setPullDistance(0);
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setSelectedImage(result.file_url);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploadingImage(false);
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // Detect @mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.substring(lastAtIndex + 1);
      if (afterAt && !afterAt.includes(' ')) {
        const suggestions = allUsers.filter(u => 
          (u.display_name || u.full_name || '').toLowerCase().includes(afterAt.toLowerCase())
          && u.email !== user?.email
        ).slice(0, 5);
        setMentionSuggestions(suggestions);
        setShowMentionDropdown(suggestions.length > 0);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (userToMention) => {
    const lastAtIndex = newMessage.lastIndexOf('@');
    const beforeAt = newMessage.substring(0, lastAtIndex);
    const mentionText = `@${userToMention.display_name || userToMention.full_name}`;
    setNewMessage(beforeAt + mentionText + ' ');
    setShowMentionDropdown(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !user || !room || isMuted || isBanned) return;
    if (newMessage.trim() && containsProfanity(newMessage)) { alert(PROFANITY_ERROR); return; }

    setSending(true);
    
    // Extract mentioned user emails from @mentions
    const mentionRegex = /@(\w+[\w\s]*)/g;
    const mentionedNames = [...newMessage.matchAll(mentionRegex)].map(m => m[1].trim());
    const mentionedEmails = allUsers
      .filter(u => mentionedNames.some(name => 
        (u.display_name || u.full_name).toLowerCase() === name.toLowerCase()
      ))
      .map(u => u.email);

    const messageData = {
      room_id: room.id,
      author_name: user.display_name || user.full_name,
      author_email: user.email,
    };
    
    if (newMessage.trim()) {
      messageData.text = newMessage.trim();
    }
    
    if (selectedImage) {
      messageData.image_url = selectedImage;
    }

    if (mentionedEmails.length > 0) {
      messageData.mentioned_user_emails = mentionedEmails;
    }
    
    // Optimistically add message to UI (prepend so it shows at bottom with flex-col-reverse)
    const tempMessage = {
      ...messageData,
      id: 'temp-' + Date.now(),
      created_date: new Date().toISOString(),
    };
    setMessages(prev => [tempMessage, ...prev]);
    
    // Clear input immediately for responsive feel
    const messageText = newMessage;
    const imageUrl = selectedImage;
    setNewMessage('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    try {
      await base44.entities.ChatMessage.create(messageData);

      // Create system notifications for mentioned users
      if (mentionedEmails.length > 0) {
        for (const email of mentionedEmails) {
          await base44.entities.Notification.create({
            type: 'chat_mention',
            title: 'New mention in chat',
            message: `${user.display_name || user.full_name} mentioned you in chat`,
            for_user: email,
            link: `/chat`
          });
        }

        // Send push notifications
        try {
          await base44.functions.invoke('sendChatMentionPush', {
            mentionedEmails,
            authorName: user.display_name || user.full_name
          });
        } catch (err) {
          console.error('Failed to send push notifications:', err);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Rollback on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(messageText);
      setSelectedImage(imageUrl);
      alert('Failed to send message. Please try again.');
    }
    setSending(false);
  };

  const handleDelete = async (messageId) => {
    // Optimistically remove message from local state
    setMessages(prev => prev.filter(m => m.id !== messageId));
    await base44.entities.ChatMessage.delete(messageId);
  };

  const handleMuteUser = async (userEmail) => {
    if (!window.confirm('Mute this user for 24 hours?')) return;
    
    const muteUntil = new Date();
    muteUntil.setHours(muteUntil.getHours() + 24);
    
    await base44.entities.UserMute.create({
      user_email: userEmail,
      muted_until: muteUntil.toISOString(),
      reason: 'Muted by admin',
      muted_by: user.email
    });
  };

  const handleBanUser = async (userEmail) => {
    if (!window.confirm('Permanently ban this user?')) return;
    
    await base44.entities.UserBan.create({
      user_email: userEmail,
      reason: 'Banned by admin',
      banned_by: user.email
    });
  };

  const handleReport = async () => {
    if (!reportReason) return;

    const msg = messages.find(m => m.id === reportDialog.messageId);
    await base44.entities.ContentReport.create({
      item_type: 'message',
      item_id: reportDialog.messageId,
      item_preview: msg?.text?.slice(0, 200) || '',
      reported_user_email: msg?.author_email || '',
      reported_user_name: msg?.author_name || '',
      reported_by: user.email,
      reason: reportReason,
      status: 'pending',
    });

    setReportDialog({ open: false, messageId: null });
    setReportReason('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center max-w-md">
          <UserX className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">You have been banned from the chat. Please contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 bg-background flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{room?.name || 'Chat'}</h1>
            {room?.description && (
              <p className="text-sm text-slate-400 mt-1">{room.description}</p>
            )}
          </div>
          <OnlineUsers roomId={room?.id} onlineCount={onlineCount} />
        </div>
      </div>

      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="overflow-y-auto p-4 flex flex-col-reverse gap-3 bg-background"
        style={{
          WebkitOverflowScrolling: 'touch',
          flex: '1 1 0',
          minHeight: 0,
        }}
      >
        {messages.filter(msg => !blockedEmails.includes(msg.author_email)).map((msg) => {
          const isOwn = msg.author_email === user?.email;
          const isAdmin = user?.role === 'admin';
          
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => navigate(createPageUrl(`MemberProfile?email=${encodeURIComponent(msg.author_email)}`))}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    {msg.author_name}
                  </button>
                  <span className="text-xs text-slate-500">
                    {new Date(msg.created_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                  {!isOwn && (
                    <>
                      <button
                        onClick={() => setReportDialog({ open: true, messageId: msg.id })}
                        className="text-xs text-slate-500 hover:text-amber-400"
                        title="Report message"
                      >
                        <Flag className="w-3 h-3" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Block ${msg.author_name}? You will no longer see their messages, posts, or comments, and you will not be able to interact with each other.`)) return;
                          const [b1, b2] = await Promise.all([
                            base44.entities.FriendRequest.filter({ sender_email: user.email, receiver_email: msg.author_email }),
                            base44.entities.FriendRequest.filter({ sender_email: msg.author_email, receiver_email: user.email }),
                          ]);
                          const all = [...b1, ...b2];
                          if (all.length > 0) {
                            await base44.entities.FriendRequest.update(all[0].id, { status: 'blocked', blocker_email: user.email });
                          } else {
                            await base44.entities.FriendRequest.create({ sender_email: user.email, receiver_email: msg.author_email, sender_name: '', receiver_name: msg.author_name, status: 'blocked', blocker_email: user.email });
                          }
                          setBlockedEmails(prev => [...prev, msg.author_email]);
                        }}
                        className="text-xs text-slate-500 hover:text-red-400"
                        title="Block user"
                      >
                        <UserX className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      {!isOwn && (
                        <>
                          <button
                            onClick={() => handleMuteUser(msg.author_email)}
                            className="text-xs text-orange-400 hover:text-orange-300"
                            title="Mute user"
                          >
                            <VolumeX className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleBanUser(msg.author_email)}
                            className="text-xs text-red-400 hover:text-red-300"
                            title="Ban user"
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        delete
                      </button>
                    </>
                  )}
                  {isOwn && !isAdmin && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      delete
                    </button>
                  )}
                </div>
                <div
                   className={`rounded-2xl px-4 py-2.5 ${
                     isOwn
                       ? 'bg-cyan-500 text-white'
                       : 'bg-slate-800 text-slate-100'
                   }`}
                 >
                   {msg.image_url && (
                     <img
                       src={msg.image_url}
                       alt="shared"
                       className="rounded-lg mb-2 max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                       onClick={() => setEnlargedImage(msg.image_url)}
                     />
                   )}
                   {msg.text && (
                     <p className="text-sm whitespace-pre-wrap break-words">
                       {msg.text.split(/(@\w+[\w\s]*)/g).map((part, idx) => 
                         part.startsWith('@') ? (
                           <span key={idx} className={isOwn ? 'bg-cyan-600 px-1 rounded' : 'bg-cyan-500 text-white px-1 rounded'}>
                             {part}
                           </span>
                         ) : part
                       )}
                     </p>
                   )}
                 </div>
              </div>
            </div>
          );
        })}
        {loadingMore && (
          <div className="text-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400 mx-auto" />
          </div>
        )}
      </div>

      <div ref={composerRef} className="flex-shrink-0 bg-background border-t border-slate-800">
        <div className="px-4 pt-4 pb-2">
          {isMuted && (
            <div className="mb-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-orange-400">You are temporarily muted</span>
            </div>
          )}
          {isInactive && (
            <div className="mb-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-400">Subscribe to post messages</span>
            </div>
          )}
          {selectedImage && (
            <div className="mb-2 relative inline-block">
              <img
                src={selectedImage}
                alt="preview"
                className="rounded-lg h-20 object-cover"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-400"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || sending || isMuted || isInactive}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                {uploadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Image className="w-4 h-4" />
                )}
              </Button>
              <div className="relative flex-1">
                <Input
                  value={newMessage}
                  onChange={handleMessageChange}
                  placeholder={isMuted ? "You are muted" : isInactive ? "Subscribe to post" : "Type @ to mention someone..."}
                  className="bg-slate-800 border-slate-700 text-white"
                  disabled={sending || isMuted || isInactive}
                />
                {showMentionDropdown && mentionSuggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10">
                    {mentionSuggestions.map(u => (
                      <button
                        key={u.id}
                        onClick={() => insertMention(u)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-200 text-sm first:rounded-t-lg last:rounded-b-lg"
                      >
                        <span className="font-medium">{u.display_name || u.full_name}</span>
                        <span className="text-slate-500 ml-2 text-xs">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={sending || isMuted || isInactive || (!newMessage.trim() && !selectedImage)}
                className="bg-cyan-500 hover:bg-cyan-400"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
        </div>
      </div>

      <Dialog open={reportDialog.open} onOpenChange={(open) => { setReportDialog({ open, messageId: null }); setReportReason(''); }}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Report Message</DialogTitle>
            <DialogDescription className="text-slate-400">
              Why are you reporting this message?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {REPORT_REASONS.map(r => (
              <button
                key={r.value}
                onClick={() => setReportReason(r.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm ${
                  reportReason === r.value
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                }`}
              >
                {r.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setReportDialog({ open: false, messageId: null }); setReportReason(''); }}
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReport}
                disabled={!reportReason}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-white"
              >
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        <Drawer open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
          <DrawerContent className="bg-slate-900 border-slate-800 h-[90vh]">
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={enlargedImage}
                alt="enlarged"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </DrawerContent>
        </Drawer>
    </div>
  );
}