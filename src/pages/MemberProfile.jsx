import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  UserPlus, UserCheck, MessageCircle, Clock, Ban, Flag,
  Instagram, Twitter, Globe, Loader2, Check, X, ShieldAlert
} from 'lucide-react';

export default function MemberProfile() {
  const [me, setMe] = useState(null);
  const [member, setMember] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [relationshipDir, setRelationshipDir] = useState(null); // 'sent' | 'received'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [loadError, setLoadError] = useState(null);
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const targetEmail = urlParams.get('email');

  useEffect(() => {
    const load = async () => {
      try {
        if (!targetEmail) {
          console.warn('MemberProfile: no email param in URL');
          setLoadError('No user specified.');
          setLoading(false);
          return;
        }

        console.log('MemberProfile: loading profile for email:', targetEmail);
        const meData = await base44.auth.me();
        setMe(meData);

        if (targetEmail === meData.email) {
          navigate(createPageUrl('Profile'));
          setLoading(false);
          return;
        }

        // Use backend function to fetch public profile (avoids User list permission error)
        const [profileRes, sentReqs, receivedReqs] = await Promise.all([
          base44.functions.invoke('getPublicProfile', { email: targetEmail }),
          base44.entities.FriendRequest.filter({ sender_email: meData.email, receiver_email: targetEmail }).catch(() => []),
          base44.entities.FriendRequest.filter({ sender_email: targetEmail, receiver_email: meData.email }).catch(() => []),
        ]);

        const profileData = profileRes.data;
        console.log('MemberProfile: query result:', profileData?.user ? 'found' : 'not found');

        if (profileData?.user) {
          setMember(profileData.user);
        } else {
          console.warn('MemberProfile: user not found for email:', targetEmail);
        }

        if (sentReqs.length > 0) {
          setRelationship(sentReqs[0]);
          setRelationshipDir('sent');
        } else if (receivedReqs.length > 0) {
          setRelationship(receivedReqs[0]);
          setRelationshipDir('received');
        }
      } catch (err) {
        console.error('MemberProfile: load error:', err);
        setLoadError(err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [targetEmail]);

  const handleSendRequest = async () => {
    setActionLoading(true);
    const req = await base44.entities.FriendRequest.create({
      sender_email: me.email,
      sender_name: me.display_name || me.full_name,
      receiver_email: targetEmail,
      receiver_name: member?.display_name || member?.full_name,
      status: 'pending',
    });
    await base44.entities.Notification.create({
      type: 'system',
      title: 'New Friend Request',
      message: `${me.display_name || me.full_name} sent you a friend request`,
      for_all: false,
      for_user: targetEmail,
      link: 'Friends?tab=requests',
    });
    setRelationship(req);
    setRelationshipDir('sent');
    setActionLoading(false);
  };

  const handleAccept = async () => {
    setActionLoading(true);
    const updated = await base44.entities.FriendRequest.update(relationship.id, { status: 'accepted' });
    await base44.entities.Notification.create({
      type: 'system',
      title: 'Friend Request Accepted',
      message: `${me.display_name || me.full_name} accepted your friend request`,
      for_all: false,
      for_user: targetEmail,
    });
    setRelationship(updated);
    setActionLoading(false);
  };

  const handleDecline = async () => {
    setActionLoading(true);
    const updated = await base44.entities.FriendRequest.update(relationship.id, { status: 'declined' });
    setRelationship(updated);
    setActionLoading(false);
  };

  const handleUnfriend = async () => {
    if (!window.confirm('Remove this friend?')) return;
    setActionLoading(true);
    await base44.entities.FriendRequest.delete(relationship.id);
    setRelationship(null);
    setRelationshipDir(null);
    setActionLoading(false);
  };

  const handleBlock = async () => {
    if (!window.confirm('Block this user? You will no longer see their content or be able to interact with each other.')) return;
    setActionLoading(true);
    if (relationship) {
      const updated = await base44.entities.FriendRequest.update(relationship.id, { status: 'blocked', blocker_email: me.email });
      setRelationship(updated);
    } else {
      const req = await base44.entities.FriendRequest.create({
        sender_email: me.email,
        sender_name: me.display_name || me.full_name,
        receiver_email: targetEmail,
        receiver_name: member?.display_name || member?.full_name,
        status: 'blocked',
        blocker_email: me.email,
      });
      setRelationship(req);
      setRelationshipDir('sent');
    }
    setActionLoading(false);
  };

  const handleUnblock = async () => {
    setActionLoading(true);
    await base44.entities.FriendRequest.delete(relationship.id);
    setRelationship(null);
    setRelationshipDir(null);
    setActionLoading(false);
  };

  const handleStartMessage = async () => {
    const emails = [me.email, targetEmail].sort();
    const p1 = emails[0], p2 = emails[1];
    const p1Name = p1 === me.email ? (me.display_name || me.full_name) : (member?.display_name || member?.full_name);
    const p2Name = p2 === me.email ? (me.display_name || me.full_name) : (member?.display_name || member?.full_name);

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

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    await base44.entities.ContentReport.create({
      item_type: 'message',
      item_id: `user:${targetEmail}`,
      item_preview: '',
      reported_user_email: targetEmail,
      reported_user_name: member?.display_name || member?.full_name || '',
      reported_by: me.email,
      reason: 'other',
      status: 'pending',
    });
    setReportDialog(false);
    setReportReason('');
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
    </div>
  );

  if (loadError) return (
    <div className="px-4 py-12 text-center">
      <p className="text-red-400 mb-2">Error loading profile</p>
      <p className="text-slate-500 text-sm">{loadError}</p>
    </div>
  );

  if (!member) return (
    <div className="px-4 py-12 text-center">
      <p className="text-slate-400">Member not found.</p>
      <p className="text-slate-500 text-sm mt-1">{targetEmail}</p>
    </div>
  );

  const isBlocked = relationship?.status === 'blocked';
  const iBlockedThem = isBlocked && relationship?.blocker_email === me?.email;
  const theyBlockedMe = isBlocked && relationship?.blocker_email !== me?.email;
  const isFriend = relationship?.status === 'accepted';
  const isPendingSent = relationship?.status === 'pending' && relationshipDir === 'sent';
  const isPendingReceived = relationship?.status === 'pending' && relationshipDir === 'received';
  const displayName = member.display_name || member.full_name || member.email?.split('@')[0] || '?';
  const isActive = member.membership_status === 'active' || member.role === 'admin';

  return (
    <div className="px-4 py-6">
      {/* Profile Header */}
      <div className="text-center mb-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center overflow-hidden mx-auto mb-4">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-white">{displayName[0]?.toUpperCase()}</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-white mb-1">{displayName}</h1>
        {member.bio && <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed">{member.bio}</p>}
        {isActive && (
          <Badge className="mt-3 bg-emerald-500/20 text-emerald-400 border-0">Active Member</Badge>
        )}
      </div>

      {/* Action Buttons */}
      {theyBlockedMe ? (
        <div className="mb-6 p-4 bg-slate-800/50 rounded-xl text-center">
          <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">You cannot interact with this user.</p>
        </div>
      ) : (
        <div className="flex gap-3 mb-6">
          {iBlockedThem ? (
            <Button onClick={handleUnblock} disabled={actionLoading} variant="outline" className="flex-1 border-orange-500/40 text-orange-400 hover:bg-orange-500/10">
              Unblock User
            </Button>
          ) : !relationship || relationship.status === 'declined' ? (
            <Button onClick={handleSendRequest} disabled={actionLoading} className="flex-1 bg-cyan-500 hover:bg-cyan-400">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" />Add Friend</>}
            </Button>
          ) : isPendingSent ? (
            <Button disabled className="flex-1 bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700">
              <Clock className="w-4 h-4 mr-2" />Request Sent
            </Button>
          ) : isPendingReceived ? (
            <>
              <Button onClick={handleAccept} disabled={actionLoading} className="flex-1 bg-emerald-500 hover:bg-emerald-400">
                <Check className="w-4 h-4 mr-2" />Accept
              </Button>
              <Button onClick={handleDecline} disabled={actionLoading} variant="outline" className="flex-1 border-slate-700 text-slate-300">
                <X className="w-4 h-4 mr-2" />Decline
              </Button>
            </>
          ) : isFriend ? (
            <>
              <Button onClick={handleStartMessage} disabled={actionLoading} className="flex-1 bg-cyan-500 hover:bg-cyan-400">
                <MessageCircle className="w-4 h-4 mr-2" />Message
              </Button>
              <Button onClick={handleUnfriend} disabled={actionLoading} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <UserCheck className="w-4 h-4 mr-2" />Friends ✓
              </Button>
            </>
          ) : null}
        </div>
      )}

      {/* Social Links */}
      {(member.instagram || member.twitter || member.website) && (
        <Card className="bg-slate-900/50 border-slate-800 mb-4">
          <CardContent className="p-4">
            <h3 className="font-semibold text-white mb-3 text-sm">Social Links</h3>
            <div className="flex flex-wrap gap-4">
              {member.instagram && (
                <a href={`https://instagram.com/${member.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-cyan-400 text-sm">
                  <Instagram className="w-4 h-4" />@{member.instagram.replace('@','')}
                </a>
              )}
              {member.twitter && (
                <a href={`https://twitter.com/${member.twitter.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-cyan-400 text-sm">
                  <Twitter className="w-4 h-4" />@{member.twitter.replace('@','')}
                </a>
              )}
              {member.website && (
                <a href={member.website.startsWith('http') ? member.website : `https://${member.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-cyan-400 text-sm">
                  <Globe className="w-4 h-4" />Website
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Block / Report */}
      {!theyBlockedMe && (
        <div className="flex gap-3 mt-4">
          {!iBlockedThem && (
            <Button onClick={handleBlock} disabled={actionLoading} variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
              <Ban className="w-4 h-4 mr-2" />Block
            </Button>
          )}
          <Button onClick={() => setReportDialog(true)} variant="outline" className="flex-1 border-slate-700 text-slate-400 hover:bg-slate-800">
            <Flag className="w-4 h-4 mr-2" />Report
          </Button>
        </div>
      )}

      <Dialog open={reportDialog} onOpenChange={setReportDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Report User</DialogTitle>
            <DialogDescription className="text-slate-400">Why are you reporting this user?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Reason</Label>
              <Textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Describe the issue..." className="bg-slate-800 border-slate-700 text-white mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setReportDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
              <Button onClick={handleReport} disabled={!reportReason.trim()} className="bg-cyan-500 hover:bg-cyan-400">Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}