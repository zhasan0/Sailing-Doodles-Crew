import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Users, Instagram, Twitter, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function OnlineUsers({ roomId, onlineCount }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadOnlineUsers = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const allPresence = await base44.entities.ChatMessageRead.filter({
        room_id: roomId
      });
      
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const onlineEmails = allPresence
        .filter(p => new Date(p.last_read_at) > twoMinutesAgo)
        .map(p => p.user_email);

      const allUsers = await base44.entities.User.list();
      const online = allUsers.filter(u => onlineEmails.includes(u.email));
      
      setOnlineUsers(online);
    } catch (err) {
      console.error('Failed to load online users:', err);
    }
    setLoading(false);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadOnlineUsers}
          className="text-slate-400 hover:text-white"
        >
          <Users className="w-4 h-4 mr-2" />
          {onlineCount} online
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-slate-900 border-slate-800 text-white overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">Online Users ({onlineCount})</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : onlineUsers.length === 0 ? (
            <p className="text-slate-400 text-sm">No users online</p>
          ) : (
            onlineUsers.map((user) => (
              <div key={user.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                <Avatar className="w-12 h-12 border-2 border-green-500">
                  <AvatarImage src={user.avatar_url} alt={user.display_name || user.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-600 text-white">
                    {(user.display_name || user.full_name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">
                      {user.display_name || user.full_name}
                    </h3>
                    {user.role === 'admin' && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-xs">Admin</Badge>
                    )}
                  </div>
                  {user.bio && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{user.bio}</p>
                  )}
                  {(user.instagram || user.twitter || user.website) && (
                    <div className="flex gap-3 mt-2">
                      {user.instagram && (
                        <a 
                          href={`https://instagram.com/${user.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {user.twitter && (
                        <a 
                          href={`https://twitter.com/${user.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Twitter className="w-4 h-4" />
                        </a>
                      )}
                      {user.website && (
                        <a 
                          href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}