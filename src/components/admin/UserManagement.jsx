import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileSelect, MobileSelectTrigger, MobileSelectContent, MobileSelectItem, MobileSelectValue } from '@/components/ui/mobile-select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, XCircle, Loader2, Search, Shield } from 'lucide-react';

const STATUS_ORDER = { active: 0, inactive: 1, cancelled: 2, undefined: 3 };

export default function UserManagement({ users }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByStatus, setSortByStatus] = useState(false);
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, status }) => {
      try {
        await base44.functions.invoke('updateUserStatus', { 
          userId, 
          status 
        });
      } catch (err) {
        console.error('Failed to update user status:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const filteredUsers = (users || [])
    .filter(user => {
      if (!user) return false;
      const email = (user.email || '').toLowerCase();
      const fullName = (user.full_name || '').toLowerCase();
      const displayName = (user.display_name || '').toLowerCase();
      const query = (searchQuery || '').toLowerCase();
      return email.includes(query) || fullName.includes(query) || displayName.includes(query);
    })
    .sort((a, b) => {
      if (!sortByStatus) return 0;
      return (STATUS_ORDER[a.membership_status] ?? 3) - (STATUS_ORDER[b.membership_status] ?? 3);
    });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-slate-500/20 text-slate-400 border-0">
            <XCircle className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-0">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/20 text-slate-400 border-0">
            Not Set
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 min-h-32">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">User Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 flex-1">
              <Search className="w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="bg-transparent border-0 text-white focus-visible:ring-0 px-0"
              />
            </div>
            <button
              onClick={() => setSortByStatus(s => !s)}
              className={`px-3 rounded-lg text-sm font-medium transition-colors border ${
                sortByStatus
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              Sort by Status
            </button>
          </div>

          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.avatar_url} alt={user.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-600 text-white">
                    {(user.display_name || user.full_name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">
                      {user.display_name || user.full_name}
                    </p>
                    {user.role === 'admin' && (
                      <Shield className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                  <p className="text-slate-400 text-sm truncate">{user.email}</p>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(user.membership_status)}
                  
                  <MobileSelect
                    value={user.membership_status || 'inactive'}
                    onValueChange={(status) => 
                      updateUserMutation.mutate({ userId: user.id, status })
                    }
                    disabled={updateUserMutation.isPending}
                  >
                    <MobileSelectTrigger className="w-32 bg-slate-900 border-slate-700 text-white">
                      <MobileSelectValue />
                    </MobileSelectTrigger>
                    <MobileSelectContent>
                      <MobileSelectItem value="active">Active</MobileSelectItem>
                      <MobileSelectItem value="inactive">Inactive</MobileSelectItem>
                      <MobileSelectItem value="cancelled">Cancelled</MobileSelectItem>
                    </MobileSelectContent>
                  </MobileSelect>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-8">
              No users found
            </p>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-slate-400">
        Total Users: {(users || []).length} | Active: {(users || []).filter(u => u.membership_status === 'active').length} | 
        Inactive: {(users || []).filter(u => !u.membership_status || u.membership_status === 'inactive').length}
      </div>
    </div>
  );
}