import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MessageCircle, Plus, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

export default function Messages() {
  const [me, setMe] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDM, setShowNewDM] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const meData = await base44.auth.me();
        setMe(meData);

        const [convos1, convos2, sentFr, receivedFr] = await Promise.all([
          base44.entities.DMConversation.filter({ participant1_email: meData.email }).catch(() => []),
          base44.entities.DMConversation.filter({ participant2_email: meData.email }).catch(() => []),
          base44.entities.FriendRequest.filter({ sender_email: meData.email, status: 'accepted' }).catch(() => []),
          base44.entities.FriendRequest.filter({ receiver_email: meData.email, status: 'accepted' }).catch(() => []),
        ]);

        const allConvos = [...convos1, ...convos2];
        allConvos.sort((a, b) => new Date(b.last_activity || b.created_date) - new Date(a.last_activity || a.created_date));
        setConversations(allConvos);

        const friendList = [
          ...sentFr.map(r => ({ email: r.receiver_email, name: r.receiver_name })),
          ...receivedFr.map(r => ({ email: r.sender_email, name: r.sender_name })),
        ];
        setFriends(friendList);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Subscribe to conversation updates (unread counts, previews)
  useEffect(() => {
    if (!me) return;
    const unsub = base44.entities.DMConversation.subscribe((event) => {
      if (event.type === 'update') {
        setConversations(prev => {
          const updated = prev.map(c => c.id === event.id ? event.data : c);
          return updated.sort((a, b) => new Date(b.last_activity || b.created_date) - new Date(a.last_activity || a.created_date));
        });
      } else if (event.type === 'create') {
        const c = event.data;
        if (c.participant1_email === me.email || c.participant2_email === me.email) {
          setConversations(prev => [c, ...prev]);
        }
      }
    });
    return unsub;
  }, [me]);

  const getConvoInfo = (convo) => {
    if (!me) return { name: '', unread: 0 };
    const isP1 = convo.participant1_email === me.email;
    return {
      name: isP1 ? (convo.participant2_name || convo.participant2_email) : (convo.participant1_name || convo.participant1_email),
      unread: isP1 ? (convo.unread_p1 || 0) : (convo.unread_p2 || 0),
      otherEmail: isP1 ? convo.participant2_email : convo.participant1_email,
    };
  };

  const handleStartDM = async (friend) => {
    const [p1, p2] = [me.email, friend.email].sort();
    const p1Name = p1 === me.email ? (me.display_name || me.full_name) : friend.name;
    const p2Name = p2 === me.email ? (me.display_name || me.full_name) : friend.name;

    const existing = conversations.find(c => c.participant1_email === p1 && c.participant2_email === p2);
    if (existing) {
      setShowNewDM(false);
      navigate(createPageUrl(`DMThread?id=${existing.id}`));
      return;
    }

    const convo = await base44.entities.DMConversation.create({
      participant1_email: p1, participant1_name: p1Name,
      participant2_email: p2, participant2_name: p2Name,
      last_activity: new Date().toISOString(), unread_p1: 0, unread_p2: 0,
    });
    setShowNewDM(false);
    navigate(createPageUrl(`DMThread?id=${convo.id}`));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
    </div>
  );

  const totalUnread = conversations.reduce((sum, c) => {
    const info = getConvoInfo(c);
    return sum + info.unread;
  }, 0);

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          {totalUnread > 0 && <p className="text-xs text-cyan-400 mt-0.5">{totalUnread} unread</p>}
        </div>
        <Button onClick={() => setShowNewDM(true)} className="bg-cyan-500 hover:bg-cyan-400 h-10" disabled={friends.length === 0}>
          <Plus className="w-4 h-4 mr-1" />New
        </Button>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-20">
          <MessageCircle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No messages yet</h3>
          <p className="text-slate-400 text-sm mb-6">
            {friends.length === 0 ? 'Add friends to start private conversations' : 'Start a conversation with a friend'}
          </p>
          {friends.length > 0 && (
            <Button onClick={() => setShowNewDM(true)} className="bg-cyan-500 hover:bg-cyan-400">
              <Plus className="w-4 h-4 mr-2" />New Message
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(convo => {
            const info = getConvoInfo(convo);
            const hasUnread = info.unread > 0;
            return (
              <button key={convo.id} onClick={() => navigate(createPageUrl(`DMThread?id=${convo.id}`))} className="w-full text-left">
                <Card className={`bg-slate-900/50 border-slate-800 hover:border-slate-600 transition-all ${hasUnread ? 'border-cyan-500/40 bg-cyan-500/5' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {(info.name)[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`font-semibold text-sm ${hasUnread ? 'text-white' : 'text-slate-200'}`}>{info.name}</span>
                          {convo.last_activity && (
                            <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                              {formatDistanceToNow(new Date(convo.last_activity), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate ${hasUnread ? 'text-slate-300' : 'text-slate-500'}`}>
                            {convo.last_message_preview || 'Start the conversation…'}
                          </p>
                          {hasUnread && (
                            <span className="ml-2 h-5 w-5 bg-cyan-500 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                              {info.unread > 9 ? '9+' : info.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {/* New DM - Pick a Friend */}
      <Dialog open={showNewDM} onOpenChange={(open) => {
        setShowNewDM(open);
        if (!open) setSearchQuery('');
      }}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">New Message</DialogTitle>
            <DialogDescription className="text-slate-400">Choose a friend to message</DialogDescription>
          </DialogHeader>
          {friends.length === 0 ? (
            <p className="text-slate-400 text-center py-6 text-sm">Add friends first to send them a message.</p>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search friends..."
                  className="pl-10 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {friends.filter(friend => 
                  (friend.name || friend.email).toLowerCase().includes(searchQuery.toLowerCase())
                ).map(friend => (
                <button key={friend.email} onClick={() => handleStartDM(friend)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {(friend.name || friend.email)[0]?.toUpperCase()}
                  </div>
                  <span className="text-white font-medium text-sm">{friend.name || friend.email}</span>
                </button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}