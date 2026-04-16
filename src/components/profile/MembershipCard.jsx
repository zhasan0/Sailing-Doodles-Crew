import React, { useState } from 'react';
import SubscribeSheet from '@/components/subscription/SubscribeSheet';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function MembershipCard({ user, onUserUpdated }) {
  const [patreonEmail, setPatreonEmail] = useState(user.patreon_email || '');
  const [editing, setEditing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const isActive = user.membership_status === 'active' || user.role === 'admin';
  const isApple = user.membership_source === 'apple';
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const verifiedAt = user.membership_verified_at
    ? format(new Date(user.membership_verified_at), 'MMM d, yyyy h:mm a')
    : null;

  const handleVerify = async () => {
    setVerifying(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('verifyMembership', {
        patreon_email: patreonEmail || undefined
      });
      const data = res.data;

      if (data.conflict) {
        setResult({ type: 'error', message: data.error });
      } else if (data.activated) {
        setResult({ type: 'success', message: 'Membership verified! Full access granted.' });
        setEditing(false);
        onUserUpdated?.();
      } else if (data.error) {
        setResult({ type: 'error', message: data.error });
      } else {
        setResult({ type: 'not_found', message: data.message || 'No active membership found for that email.' });
      }
    } catch (err) {
      setResult({ type: 'error', message: 'Verification failed. Please try again.' });
    }
    setVerifying(false);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 mb-4">
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-white mb-2">Membership Access</h3>

        {/* Instructional text */}
        <div className="p-3 rounded-lg bg-slate-800/50 text-sm text-slate-400 space-y-2 mb-1">
          <p className="text-slate-300">Your account login is separate from your membership.</p>
          <p>You can unlock full access in one of two ways:</p>
          <p><strong className="text-slate-200">Already a Patreon member?</strong><br />Enter your Patreon email and tap <em>Verify Membership</em> to unlock access.</p>
          <p><strong className="text-slate-200">Not a member?</strong><br />Tap <em>Subscribe to Unlock Access</em> to subscribe through the App Store.</p>
          <p className="text-amber-400/80 text-xs">⚠️ Patreon is only used to verify existing memberships and is not required to use the app.</p>
        </div>

        {/* Sailing Doodles account */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Sailing Doodles Account</p>
            <p className="text-white text-sm">{user.email}</p>
            <p className="text-xs text-slate-500 mt-0.5">Your login — not used for Patreon</p>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-0 shrink-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            Signed In
          </Badge>
        </div>

        {/* Patreon email */}
        <div className="p-3 rounded-lg bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Patreon / Podia Email</p>
              <p className="text-white text-sm">
                {patreonEmail || user.email}
                {!user.patreon_email && (
                  <span className="text-slate-500 text-xs ml-1">(using account email)</span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Only used to verify membership — not for login</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setEditing(!editing); setResult(null); }}
              className="text-cyan-400 hover:text-cyan-300 shrink-0"
            >
              {editing ? 'Cancel' : 'Change'}
            </Button>
          </div>

          {editing && (
            <div className="space-y-2 pt-1">
              <Label className="text-slate-400 text-xs">
                Enter the email address associated with your Patreon or Podia subscription
              </Label>
              <Input
                value={patreonEmail}
                onChange={(e) => setPatreonEmail(e.target.value.toLowerCase().trim())}
                placeholder="patreon@example.com"
                className="bg-slate-900 border-slate-700 text-white"
                type="email"
              />
            </div>
          )}
        </div>

        {/* Membership status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Membership Status</p>
            <p className="text-sm text-slate-300">
              {isActive ? 'Active — full community access' : 'Inactive — limited access'}
            </p>
            {verifiedAt && (
              <p className="text-xs text-slate-500 mt-0.5">Last verified: {verifiedAt}</p>
            )}
          </div>
          <Badge className={isActive
            ? "bg-emerald-500/20 text-emerald-400 border-0 shrink-0"
            : "bg-red-500/20 text-red-400 border-0 shrink-0"
          }>
            {isActive
              ? <><CheckCircle className="w-3 h-3 mr-1" />Active</>
              : <><XCircle className="w-3 h-3 mr-1" />Inactive</>
            }
          </Badge>
        </div>

        {/* Result feedback */}
        {result && (
          <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
            result.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
            result.type === 'not_found' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' :
            'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{result.message}</span>
          </div>
        )}

        {/* Verify button */}
        <Button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-white"
        >
          {verifying ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" />Verify Membership</>
          )}
        </Button>

        {!isActive && (
          <Button
            onClick={() => setSubscribeOpen(true)}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
          >
            Subscribe to Unlock Access
          </Button>
        )}

        {isApple && user.apple_subscription_expires && (
          <p className="text-xs text-slate-500 text-center">
            Apple subscription renews{' '}
            {new Date(user.apple_subscription_expires).toLocaleDateString()}
          </p>
        )}

        <SubscribeSheet
          open={subscribeOpen}
          onOpenChange={setSubscribeOpen}
          onSubscribed={() => { setSubscribeOpen(false); onUserUpdated?.(); }}
        />
      </CardContent>
    </Card>
  );
}