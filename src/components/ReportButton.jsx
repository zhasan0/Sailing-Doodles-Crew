import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Flag, UserX, MoreVertical, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
];

export default function ReportButton({
  itemType,      // 'post' | 'comment' | 'message'
  itemId,
  itemPreview,
  targetUserEmail,
  targetUserName,
  currentUserEmail,
  onBlocked,     // optional callback when user is blocked
  className = '',
}) {
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // Don't show on own content
  if (!targetUserEmail || targetUserEmail === currentUserEmail) return null;

  const handleReport = async () => {
    if (!reason) return;
    setSubmitting(true);
    await base44.entities.ContentReport.create({
      item_type: itemType,
      item_id: itemId,
      item_preview: itemPreview?.slice(0, 200) || '',
      reported_user_email: targetUserEmail,
      reported_user_name: targetUserName || '',
      reported_by: currentUserEmail,
      reason,
      status: 'pending',
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setShowReport(false);
      setSubmitted(false);
      setReason('');
    }, 1500);
  };

  const handleBlock = async () => {
    setBlocking(true);
    const [p1, p2] = [currentUserEmail, targetUserEmail].sort();

    // Check for existing FriendRequest
    const existing = await base44.entities.FriendRequest.filter({
      sender_email: p1, receiver_email: p2
    });
    const existing2 = await base44.entities.FriendRequest.filter({
      sender_email: p2, receiver_email: p1
    });

    const all = [...existing, ...existing2];
    if (all.length > 0) {
      await base44.entities.FriendRequest.update(all[0].id, {
        status: 'blocked',
        blocker_email: currentUserEmail,
      });
    } else {
      await base44.entities.FriendRequest.create({
        sender_email: currentUserEmail,
        receiver_email: targetUserEmail,
        sender_name: '',
        receiver_name: targetUserName || '',
        status: 'blocked',
        blocker_email: currentUserEmail,
      });
    }
    setBlocked(true);
    setBlocking(false);
    if (onBlocked) onBlocked(targetUserEmail);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={`h-7 w-7 text-slate-500 hover:text-white ${className}`}>
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
          <DropdownMenuItem
            className="text-slate-300 hover:text-white cursor-pointer gap-2"
            onClick={() => setShowReport(true)}
          >
            <Flag className="w-4 h-4 text-amber-400" />
            Report
          </DropdownMenuItem>
          {!blocked && (
            <>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                className="text-red-400 hover:text-red-300 cursor-pointer gap-2"
                onClick={handleBlock}
                disabled={blocking}
              >
                <UserX className="w-4 h-4" />
                {blocking ? 'Blocking...' : `Block ${targetUserName || 'user'}`}
              </DropdownMenuItem>
            </>
          )}
          {blocked && (
            <DropdownMenuItem disabled className="text-slate-500 gap-2">
              <CheckCircle className="w-4 h-4" />
              Blocked
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-400" />
              Report Content
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Why are you reporting this {itemType}?
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-white font-medium">Report submitted</p>
              <p className="text-slate-400 text-sm mt-1">Our team will review it shortly.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm ${
                    reason === r.value
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {r.label}
                </button>
              ))}
              <Button
                onClick={handleReport}
                disabled={!reason || submitting}
                className="w-full bg-amber-500 hover:bg-amber-400 text-white mt-2"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}