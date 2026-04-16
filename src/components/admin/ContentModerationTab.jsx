import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag, XCircle, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-amber-400',
  reviewed: 'bg-green-500/20 text-green-400',
  removed: 'bg-red-500/20 text-red-400',
  dismissed: 'bg-slate-500/20 text-slate-400',
};

export default function ContentModerationTab() {
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState(null);
  const [successId, setSuccessId] = useState(null);

  const { data: reports = [] } = useQuery({
    queryKey: ['content-reports'],
    queryFn: () => base44.entities.ContentReport.filter({ status: 'pending' }, '-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ContentReport.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content-reports'] }),
  });

  const handleRemove = async (report) => {
    setRemovingId(report.id);
    try {
      const res = await base44.functions.invoke('moderateContent', {
        item_type: report.item_type,
        item_id: report.item_id,
        report_id: report.id,
      });
      console.log('[ContentModerationTab] moderateContent result:', res.data);
      setSuccessId(report.id);
      setTimeout(() => {
        setSuccessId(null);
        queryClient.invalidateQueries({ queryKey: ['content-reports'] });
      }, 1200);
    } catch (err) {
      console.error('[ContentModerationTab] Remove content failed:', err);
      alert(`Failed to remove content: ${err.response?.data?.error || err.message}`);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Flag className="w-5 h-5 text-amber-400" />
          User Reports ({reports.length} pending)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.length === 0 ? (
          <p className="text-slate-400 text-sm">No pending reports</p>
        ) : (
          reports.map(report => (
            <div key={report.id} className="p-3 bg-slate-800/50 rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={STATUS_COLORS[report.status] + ' border-0 text-xs'}>
                      {report.item_type}
                    </Badge>
                    <span className="text-xs text-amber-400 font-medium capitalize">{report.reason}</span>
                  </div>
                  <p className="text-sm text-slate-300 truncate">
                    <span className="text-slate-500">User: </span>{report.reported_user_name || report.reported_user_email}
                  </p>
                  {report.item_preview && (
                    <p className="text-xs text-slate-500 italic truncate">"{report.item_preview}"</p>
                  )}
                  <p className="text-xs text-slate-600">
                    Reported by {report.reported_by} · {format(new Date(report.created_date), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handleRemove(report)}
                  disabled={removingId === report.id || successId === report.id}
                  className="bg-red-600 hover:bg-red-500 text-white h-8 text-xs gap-1"
                >
                  {removingId === report.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : successId === report.id ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  {successId === report.id ? 'Removed!' : removingId === report.id ? 'Removing...' : 'Remove Content'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateMutation.mutate({ id: report.id, status: 'dismissed' })}
                  disabled={removingId === report.id}
                  className="border-slate-600 text-slate-400 hover:bg-slate-700 h-8 text-xs gap-1"
                >
                  <XCircle className="w-3 h-3" />
                  Dismiss
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}