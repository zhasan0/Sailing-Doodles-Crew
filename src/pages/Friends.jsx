import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, UserPlus, MessageCircle, Check, X, Loader2, Clock, UserCheck } from 'lucide-react';

export default function Friends() {
  const [me, setMe] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || 'search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [relationships, setRelationships] = useState({});
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [blockedUsers, setBlockedUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const meData = await base44.auth.me();
        setMe(meData);

        const [membersRes, sentReqs, receivedReqs] = await Promise.all([
          base44.functions.invoke('searchMembers', {}).catch(() => ({ data: { members: [] } })),
          base44.entities.FriendRequest.filter({ sender_email: meData.email }).catch(() => []),
          base44.entities.FriendRequest.filter({ receiver_email: meData.email }).catch(() => []),
        ]);
        const users = membersRes.data?.members || [];

        const relMap = {};
        sentReqs.forEach(r => { relMap[r.receiver_email] = { ...r, dir: 'sent' }; });
        receivedReqs.forEach(r => { relMap[r.sender_email] = { ...r, dir: 'received' }; });
        setRelationships(relMap);

        setAllUsers(users.filter(u => u.email !== meData.email));

        setIncomingRequests(receivedReqs.filter(r => r.status === 'pending'));
        setOutgoingRequests(sentReqs.filter(r => r.status === 'pending'));

        // Build friends list
        const seen = new Set();
        const friendList = [];
        [...sentReqs, ...receivedReqs].forEach(r => {
          if (r.status !== 'accepted') return;
          const friendEmail = r.sender_email === meData.email ? r.receiver_email : r.sender_email;
          const friendName = r.sender_email === meData.email ? r.receiver_name : r.sender_name;
          if (!seen.has(friendEmail)) {
            seen.add(friendEmail);
            friendList.push({ ...r, friend_email: friendEmail, friend_name: friendName });
          }
        });
        setFriends(friendList);

        // Load blocked users
        const [bk1, bk2] = await Promise.all([
          base44.entities.FriendRequest.filter({ sender_email: meData.email, status: 'blocked' }).catch(() => []),
          base44.entities.FriendRequest.filter({ receiver_email: meData.email, status: 'blocked' }).catch(() => []),
        ]);
        const blocked = [
          ...bk1.filter(r => r.blocker_email === meData.email).map(r => ({ id: r.id, email: r.receiver_email, name: r.receiver_name })),
          ...bk2.filter(r => r.blocker_email === meData.email).map(r => ({ id: r.id, email: r.sender_email, name: r.sender_name })),
        ];
        setBlockedUsers(blocked);
      } catch (err) {
        console.error('Failed to load friends page:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    setSearchResults(
      allUsers.filter(u => (u.display_name || u.full_name || '').toLowerCase().includes(q)).slice(0, 20)
    );
  }, [searchQuery, allUsers]);

  const handleSendRequest = async (targetUser) => {
    setActionLoading(prev => ({ ...prev, [targetUser.email]: true }));
    const req = await base44.entities.FriendRequest.create({
      sender_email: me.email,
      sender_name: me.display_name || me.full_name,
      receiver_email: targetUser.email,
      receiver_name: targetUser.display_name || targetUser.full_name,
      status: 'pending',
    });
    await base44.entities.Notification.create({
      type: 'system', title: 'New Friend Request',
      message: `${me.display_name || me.full_name} sent you a friend request`,
      for_all: false, for_user: targetUser.email,
      link: 'Friends?tab=requests',
    });
    setRelationships(prev => ({ ...prev, [targetUser.email]: { ...req, dir: 'sent' } }));
    setOutgoingRequests(prev => [...prev, req]);
    setActionLoading(prev => ({ ...prev, [targetUser.email]: false }));
  };

  const handleAccept = async (request) => {
    const senderEmail = request.sender_email;
    setActionLoading(prev => ({ ...prev, [senderEmail]: true }));
    const updated = await base44.entities.FriendRequest.update(request.id, { status: 'accepted' });
    await base44.entities.Notification.create({
      type: 'system', title: 'Friend Request Accepted',
      message: `${me.display_name || me.full_name} accepted your friend request`,
      for_all: false, for_user: senderEmail,
    });
    setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
    setRelationships(prev => ({ ...prev, [senderEmail]: { ...updated, dir: 'received' } }));
    setFriends(prev => [...prev, { ...updated, friend_email: senderEmail, friend_name: request.sender_name }]);
    setActionLoading(prev => ({ ...prev, [senderEmail]: false }));
  };

  const handleDecline = async (request) => {
    const senderEmail = request.sender_email;
    setActionLoading(prev => ({ ...prev, [senderEmail]: true }));
    await base44.entities.FriendRequest.update(request.id, { status: 'declined' });
    setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
    setRelationships(prev => { const u = { ...prev }; delete u[senderEmail]; return u; });
    setActionLoading(prev => ({ ...prev, [senderEmail]: false }));
  };

  const handleStartDM = async (friendEmail, friendName) => {
    const [p1, p2] = [me.email, friendEmail].sort();
    const p1Name = p1 === me.email ? (me.display_name || me.full_name) : friendName;
    const p2Name = p2 === me.email ? (me.display_name || me.full_name) : friendName;
    const existing = await base44.entities.DMConversation.filter({ participant1_email: p1, participant2_email: p2 });
    let convo = existing[0];
    if (!convo) {
      convo = await base44.entities.DMConversation.create({
        participant1_email: p1, participant1_name: p1Name,
        participant2_email: p2, participant2_name: p2Name,
        last_activity: new Date().toISOString(), unread_p1: 0, unread_p2: 0,
      });
    }
    navigate(createPageUrl(`DMThread?id=${convo.id}`));
  };

  const RelBadge = ({ email }) => {
    const rel = relationships[email];
    if (!rel || rel.status === 'declined') return null;
    if (rel.status === 'pending' && rel.dir === 'sent') return <Badge className="bg-slate-700 text-slate-400 border-0 text-xs">Sent</Badge>;
    if (rel.status === 'pending' && rel.dir === 'received') return <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">Incoming</Badge>;
    if (rel.status === 'accepted') return <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs"><UserCheck className="w-3 h-3 mr-1" />Friends</Badge>;
    if (rel.status === 'blocked') return <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Blocked</Badge>;
    return null;
  };

  const handleUnblock = async (blockedUser) => {
    setActionLoading(prev => ({ ...prev, [blockedUser.email]: true }));
    await base44.entities.FriendRequest.delete(blockedUser.id);
    setBlockedUsers(prev => prev.filter(b => b.id !== blockedUser.id));
    setRelationships(prev => { const u = { ...prev }; delete u[blockedUser.email]; return u; });
    setActionLoading(prev => ({ ...prev, [blockedUser.email]: false }));
  };

  const tabs = [
    { key: 'search', label: 'Search Members', icon: Search },
    { key: 'requests', label: `Requests${incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ''}`, icon: Clock },
    { key: 'friends', label: 'My Friends', icon: Users },
    { key: 'blocked', label: `Blocked${blockedUsers.length > 0 ? ` (${blockedUsers.length})` : ''}`, icon: X },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
    </div>
  );

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Friends</h1>

      {/* Tabs */}
      <div className="flex bg-slate-800/50 rounded-xl p-1 mb-6 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.key ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by name..."
              className="pl-10 bg-slate-800 border-slate-700 text-white"
              autoFocus
            />
          </div>
          {searchQuery && searchResults.length === 0 && (
            <p className="text-slate-400 text-center py-8 text-sm">No members found for "{searchQuery}"</p>
          )}
          {searchResults.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-2">
                {searchResults.map(u => {
                  const rel = relationships[u.email];
                  const isLoading = actionLoading[u.email];
                  const name = u.display_name || u.full_name || u.email;
                  const canAdd = !rel || rel.status === 'declined';
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors">
                      <button onClick={() => navigate(createPageUrl(`MemberProfile?email=${encodeURIComponent(u.email)}`))} className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center overflow-hidden">
                          {u.avatar_url ? <img src={u.avatar_url} alt={name} className="w-full h-full object-cover" /> : <span className="text-white font-bold">{name[0]?.toUpperCase()}</span>}
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => navigate(createPageUrl(`MemberProfile?email=${encodeURIComponent(u.email)}`))} className="text-white font-medium text-sm hover:text-cyan-400 text-left">
                          {name}
                        </button>
                      </div>
                      <div className="flex-shrink-0">
                        {canAdd ? (
                          <Button size="sm" onClick={() => handleSendRequest(u)} disabled={isLoading} className="bg-cyan-500 hover:bg-cyan-400 h-8 text-xs px-3">
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><UserPlus className="w-3 h-3 mr-1" />Add</>}
                          </Button>
                        ) : <RelBadge email={u.email} />}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          {!searchQuery && (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Search for crew members to add as friends</p>
            </div>
          )}
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {incomingRequests.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Incoming Requests</h3>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-2">
                  {incomingRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {(req.sender_name || req.sender_email)[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{req.sender_name || req.sender_email}</p>
                        <p className="text-slate-500 text-xs">wants to be friends</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" onClick={() => handleAccept(req)} disabled={actionLoading[req.sender_email]} className="bg-emerald-500 hover:bg-emerald-400 h-9 w-9 p-0">
                          {actionLoading[req.sender_email] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" onClick={() => handleDecline(req)} disabled={actionLoading[req.sender_email]} variant="outline" className="border-slate-700 text-slate-300 h-9 w-9 p-0">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
          {outgoingRequests.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Sent Requests</h3>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-2">
                  {outgoingRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {(req.receiver_name || req.receiver_email)[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{req.receiver_name || req.receiver_email}</p>
                      </div>
                      <Badge className="bg-slate-700 text-slate-400 border-0 text-xs flex-shrink-0">
                        <Clock className="w-3 h-3 mr-1" />Pending
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
          {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
            <div className="text-center py-16">
              <UserPlus className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">No pending friend requests</p>
            </div>
          )}
        </div>
      )}

      {/* FRIENDS TAB */}
      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">No friends yet</p>
              <p className="text-slate-500 text-xs mt-1">Search for crew members to connect</p>
            </div>
          ) : (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-2">
                {friends.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors">
                    <button onClick={() => navigate(createPageUrl(`MemberProfile?email=${encodeURIComponent(f.friend_email)}`))} className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {(f.friend_name || f.friend_email)[0]?.toUpperCase()}
                    </button>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => navigate(createPageUrl(`MemberProfile?email=${encodeURIComponent(f.friend_email)}`))} className="text-white font-medium text-sm hover:text-cyan-400 text-left">
                        {f.friend_name || f.friend_email}
                      </button>
                    </div>
                    <Button size="sm" onClick={() => handleStartDM(f.friend_email, f.friend_name)} className="bg-cyan-500 hover:bg-cyan-400 h-9 text-xs flex-shrink-0">
                      <MessageCircle className="w-3 h-3 mr-1" />Message
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* BLOCKED TAB */}
      {activeTab === 'blocked' && (
        <div>
          {blockedUsers.length === 0 ? (
            <div className="text-center py-16">
              <X className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">No blocked users</p>
            </div>
          ) : (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-2">
                {blockedUsers.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {(b.name || b.email)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{b.name || b.email}</p>
                      <p className="text-slate-500 text-xs">Blocked</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnblock(b)}
                      disabled={actionLoading[b.email]}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8 text-xs flex-shrink-0"
                    >
                      {actionLoading[b.email] ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Unblock'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}