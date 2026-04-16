import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, UserCircle } from 'lucide-react';
import ReportButton from '../components/ReportButton';
import { containsProfanity, PROFANITY_ERROR } from '../utils/contentFilter';

export default function DMThread() {
  const [me, setMe] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const meRef = useRef(null);
  const convoRef = useRef(null);
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const conversationId = urlParams.get('id');

  useEffect(() => {
    const load = async () => {
      try {
        const meData = await base44.auth.me();
        setMe(meData);
        meRef.current = meData;

        // Load conversation by finding it among user's convos
        const [convos1, convos2] = await Promise.all([
          base44.entities.DMConversation.filter({ participant1_email: meData.email }).catch(() => []),
          base44.entities.DMConversation.filter({ participant2_email: meData.email }).catch(() => []),
        ]);
        const convo = [...convos1, ...convos2].find(c => c.id === conversationId);

        if (!convo) { setLoading(false); return; }
        setConversation(convo);
        convoRef.current = convo;

        // Load messages (oldest first)
        const msgs = await base44.entities.DirectMessage.filter({ conversation_id: conversationId }, '-created_date', 100).catch(() => []);
        setMessages(msgs.reverse());

        // Mark as read
        const isP1 = convo.participant1_email === meData.email;
        const hasUnread = isP1 ? (convo.unread_p1 || 0) > 0 : (convo.unread_p2 || 0) > 0;
        if (hasUnread) {
          const updateData = isP1 ? { unread_p1: 0 } : { unread_p2: 0 };
          const updated = await base44.entities.DMConversation.update(convo.id, updateData);
          setConversation(updated);
          convoRef.current = updated;
        }
      } catch (err) {
        console.error('Failed to load DM thread:', err);
      } finally {
        setLoading(false);
      }
    };
    if (conversationId) load();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to new incoming messages
  useEffect(() => {
    if (!conversationId) return;
    const unsub = base44.entities.DirectMessage.subscribe(async (event) => {
      if (event.data?.conversation_id !== conversationId) return;
      const currentMe = meRef.current;
      if (event.type === 'create' && event.data.sender_email !== currentMe?.email) {
        setMessages(prev => [...prev, event.data]);
        // Mark as read immediately since we're viewing
        const currentConvo = convoRef.current;
        if (currentConvo) {
          const isP1 = currentConvo.participant1_email === currentMe?.email;
          const updateData = isP1 ? { unread_p1: 0 } : { unread_p2: 0 };
          const updated = await base44.entities.DMConversation.update(currentConvo.id, updateData);
          setConversation(updated);
          convoRef.current = updated;
        }
      }
    });
    return unsub;
  }, [conversationId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !me || !conversation || sending) return;
    if (containsProfanity(newMessage)) { alert(PROFANITY_ERROR); return; }

    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    const msgData = {
      conversation_id: conversationId,
      sender_email: me.email,
      sender_name: me.display_name || me.full_name,
      text,
      is_read: false,
    };

    // Optimistic UI
    const temp = { ...msgData, id: 'temp-' + Date.now(), created_date: new Date().toISOString() };
    setMessages(prev => [...prev, temp]);

    const isP1 = conversation.participant1_email === me.email;
    const otherEmail = isP1 ? conversation.participant2_email : conversation.participant1_email;
    const unreadField = isP1 ? 'unread_p2' : 'unread_p1';
    const currentOtherUnread = isP1 ? (conversation.unread_p2 || 0) : (conversation.unread_p1 || 0);

    const realMsg = await base44.entities.DirectMessage.create(msgData);
    setMessages(prev => prev.map(m => m.id === temp.id ? realMsg : m));

    const convoUpdate = {
      last_message_preview: text.length > 60 ? text.substring(0, 57) + '...' : text,
      last_activity: new Date().toISOString(),
      [unreadField]: currentOtherUnread + 1,
    };
    const updatedConvo = await base44.entities.DMConversation.update(conversationId, convoUpdate);
    setConversation(updatedConvo);
    convoRef.current = updatedConvo;

    // Notify recipient
    await base44.entities.Notification.create({
      type: 'system',
      title: `Message from ${me.display_name || me.full_name}`,
      message: text.length > 50 ? text.substring(0, 47) + '...' : text,
      for_all: false,
      for_user: otherEmail,
    });

    setSending(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
    </div>
  );

  if (!conversation) return (
    <div className="flex items-center justify-center py-20 px-4 text-center">
      <p className="text-slate-400">Conversation not found.</p>
    </div>
  );

  const isP1 = conversation.participant1_email === me?.email;
  const otherName = isP1
    ? (conversation.participant2_name || conversation.participant2_email)
    : (conversation.participant1_name || conversation.participant1_email);
  const otherEmail = isP1 ? conversation.participant2_email : conversation.participant1_email;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-background">
        <button
          onClick={() => navigate(createPageUrl(`MemberProfile?email=${encodeURIComponent(otherEmail)}`))}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          {otherName[0]?.toUpperCase()}
        </button>
        <div>
          <button
            onClick={() => navigate(createPageUrl(`MemberProfile?email=${encodeURIComponent(otherEmail)}`))}
            className="text-lg font-bold text-white hover:text-cyan-400 transition-colors"
          >
            {otherName}
          </button>
          <p className="text-xs text-slate-500">Private message</p>
        </div>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto p-4 flex flex-col gap-2 bg-background" style={{ WebkitOverflowScrolling: 'touch', position: 'fixed', top: 'calc(64px + env(safe-area-inset-top) + 60px)', left: 0, right: 0, bottom: 'calc(64px + 5rem + env(safe-area-inset-bottom))', marginLeft: 'auto', marginRight: 'auto', maxWidth: '28rem', width: '100%' }}>
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-center py-10">
            <div>
              <UserCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Say hello to {otherName}!</p>
            </div>
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_email === me?.email;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-2.5 ${isOwn ? 'bg-cyan-500 text-white rounded-br-sm' : 'bg-slate-800 text-slate-100 rounded-bl-sm'}`}>
                       <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                     </div>
                    {!isOwn && (
                      <div className="mt-1">
                        <ReportButton
                          itemType="message"
                          itemId={msg.id}
                          itemPreview={msg.text}
                          targetUserEmail={msg.sender_email}
                          targetUserName={msg.sender_name}
                          currentUserEmail={me?.email}
                        />
                      </div>
                    )}
                <span className="text-xs text-slate-600 mt-1 px-1">
                  {new Date(msg.created_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-background border-t border-slate-800 max-w-lg mx-auto p-4" style={{ width: '100%' }}>
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${otherName}...`}
            className="bg-slate-800 border-slate-700 text-white flex-1"
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !newMessage.trim()} className="bg-cyan-500 hover:bg-cyan-400 flex-shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}