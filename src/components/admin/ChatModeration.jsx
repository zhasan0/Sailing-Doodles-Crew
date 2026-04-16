import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserX, VolumeX, Flag, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatModeration() {
  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ['message-reports'],
    queryFn: () => base44.entities.MessageReport.filter({ status: 'pending' }, '-created_date'),
  });

  const { data: mutes = [] } = useQuery({
    queryKey: ['user-mutes'],
    queryFn: () => base44.entities.UserMute.list('-created_date', 20),
  });

  const { data: bans = [] } = useQuery({
    queryKey: ['user-bans'],
    queryFn: () => base44.entities.UserBan.list('-created_date', 20),
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.MessageReport.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-reports'] });
    },
  });

  const deleteMuteMutation = useMutation({
    mutationFn: (id) => base44.entities.UserMute.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-mutes'] });
    },
  });

  const deleteBanMutation = useMutation({
    mutationFn: (id) => base44.entities.UserBan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bans'] });
    },
  });

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-400" />
            Reported Messages ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-slate-400 text-sm">No pending reports</p>
          ) : (
            reports.map(report => (
              <div key={report.id} className="p-3 bg-slate-800/50 rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-300">Reported by: {report.reported_by}</p>
                    <p className="text-sm text-slate-400">Reason: {report.reason}</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(report.created_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateReportMutation.mutate({ id: report.id, status: 'reviewed' })}
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateReportMutation.mutate({ id: report.id, status: 'dismissed' })}
                      className="border-slate-600 text-slate-400 hover:bg-slate-700"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <VolumeX className="w-5 h-5 text-orange-400" />
            Muted Users ({mutes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mutes.length === 0 ? (
            <p className="text-slate-400 text-sm">No muted users</p>
          ) : (
            mutes.map(mute => (
              <div key={mute.id} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">{mute.user_email}</p>
                  <p className="text-xs text-slate-500">
                    Until: {mute.muted_until ? format(new Date(mute.muted_until), 'MMM d, h:mm a') : 'Permanent'}
                  </p>
                  {mute.reason && <p className="text-xs text-slate-500">Reason: {mute.reason}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteMuteMutation.mutate(mute.id)}
                  className="border-slate-600 text-slate-400 hover:bg-slate-700"
                >
                  Unmute
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-400" />
            Banned Users ({bans.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bans.length === 0 ? (
            <p className="text-slate-400 text-sm">No banned users</p>
          ) : (
            bans.map(ban => (
              <div key={ban.id} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">{ban.user_email}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(ban.created_date), 'MMM d, yyyy')}
                  </p>
                  {ban.reason && <p className="text-xs text-slate-500">Reason: {ban.reason}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteBanMutation.mutate(ban.id)}
                  className="border-slate-600 text-slate-400 hover:bg-slate-700"
                >
                  Unban
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}