import React, { useState, useEffect } from 'react';
import SubscribeSheet from '../components/subscription/SubscribeSheet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Anchor, Lock, Mail, ExternalLink, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AccessRequired() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleCheckMembership = async () => {
    setChecking(true);
    try {
      await base44.functions.invoke('autoActivatePatron', {});
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
    } catch (err) {
      console.error(err);
    }
    setChecking(false);
    setChecked(true);
  };

  const isActive = user?.membership_status === 'active' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center max-w-sm w-full">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
          <Lock className="w-10 h-10 text-slate-500" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Member Access Required
        </h1>
        <p className="text-slate-400 mb-6">
          This content is available to active Crew Club members. You are signed in to your Sailing Doodles account, but your membership is not yet active.
        </p>

        {/* Account status card */}
        <Card className="bg-slate-900/50 border-slate-800 mb-6 text-left">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-white text-sm">Your Account</h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Signed in as</p>
                <p className="text-white text-sm">{user?.email || '...'}</p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 shrink-0">
                <CheckCircle className="w-3 h-3 mr-1" />
                Signed In
              </Badge>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <div>
                <p className="text-xs text-slate-500">Membership status</p>
                <p className="text-sm text-slate-300">
                  {isActive ? 'Active — full access unlocked' : 'Inactive — premium features locked'}
                </p>
              </div>
              <Badge className={isActive
                ? "bg-emerald-500/20 text-emerald-400 border-0 shrink-0"
                : "bg-red-500/20 text-red-400 border-0 shrink-0"
              }>
                {isActive ? (
                  <><CheckCircle className="w-3 h-3 mr-1" />Active</>
                ) : (
                  <><XCircle className="w-3 h-3 mr-1" />Inactive</>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* How membership works */}
        <Card className="bg-slate-900/50 border-slate-800 mb-6">
          <CardContent className="p-5">
            <h3 className="font-semibold text-white mb-4 text-left">How membership works</h3>
            <div className="space-y-4 text-left">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <p className="text-slate-300 text-sm">
                  <strong className="text-white">Sign in</strong> to your Sailing Doodles account — you've already done this.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <p className="text-slate-300 text-sm">
                  <strong className="text-white">Subscribe</strong> on Patreon or Podia using the same email address as your Sailing Doodles account.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <p className="text-slate-300 text-sm">
                  Tap <strong className="text-white">"Verify Membership"</strong> below — the app will check your subscription status and unlock access automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {checked && isActive && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
            ✓ Membership verified! You now have full access.
          </div>
        )}
        {checked && !isActive && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
            No active membership found for this email. Make sure you subscribed using <strong>{user?.email}</strong>.
          </div>
        )}

        <div className="space-y-3">
          <Button
            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold"
            onClick={() => setSubscribeOpen(true)}
          >
            Subscribe to Unlock Access
          </Button>

          <Button
            className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white"
            onClick={handleCheckMembership}
            disabled={checking}
          >
            {checking ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Already a member? Verify access</>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => window.location.href = 'mailto:support@sailingdoodles.com'}
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </div>

        <SubscribeSheet
          open={subscribeOpen}
          onOpenChange={setSubscribeOpen}
          onSubscribed={() => {
            setSubscribeOpen(false);
            loadUser();
          }}
        />

        <Link to={createPageUrl('Profile')} className="block mt-4">
          <Button variant="ghost" className="text-slate-400 hover:text-white">
            Go to Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}