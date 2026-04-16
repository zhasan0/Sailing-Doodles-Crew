import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import IAPDebugPanel from '@/components/subscription/IAPDebugPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, RefreshCw, Anchor, AlertCircle } from 'lucide-react';
import { useIAP } from '@/hooks/useIAP';

const FEATURES = [
  'Full access to all posts & photos',
  'Live streams & events',
  'Community forum & chat',
  'Sailing destination map',
  'Direct messages with crew',
];

export default function SubscribeSheet({ open, onOpenChange, onSubscribed }) {
  const { product, purchasing, restoring, error, ready, purchaseSuccess, isNative, purchase, restorePurchases } = useIAP();
  const [restoreResult, setRestoreResult] = useState(null);

  const handlePurchase = async () => {
    console.log('[IAP][SUBSCRIBE_BUTTON] ████ NEW BUILD MARKER 2026-03-29 v2 ████ Subscribe button tapped');
    await purchase();
    // onSubscribed will be called when purchaseSuccess is set via the approved event
  };

  // Call onSubscribed when purchase is verified
  useEffect(() => {
    if (purchaseSuccess) {
      onSubscribed?.();
    }
  }, [purchaseSuccess]);

  const handleRestore = async () => {
    setRestoreResult(null);
    await restorePurchases();
  };

  const priceLabel = product?.offers?.[0]?.pricingPhases?.[0]?.price
    || product?.pricing?.price
    || 'Loading…';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-slate-900 border-slate-700 rounded-t-2xl px-6 py-8">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Anchor className="w-5 h-5 text-white" />
            </div>
            <SheetTitle className="text-white text-xl">Join the Crew Club</SheetTitle>
          </div>
          <p className="text-slate-400 text-sm text-left">
            Subscribe to unlock full access to the Sailing Doodles community.
          </p>
        </SheetHeader>

        {/* Subscription Details Box */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Crew Club Monthly</p>
              <p className="text-slate-400 text-xs">1-month subscription</p>
            </div>
            <p className="text-cyan-400 font-bold text-lg">
              {product?.offers?.[0]?.pricingPhases?.[0]?.price || product?.pricing?.price || '—'}
            </p>
          </div>
        </div>

        <ul className="space-y-2 mb-6">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-slate-300 text-sm">
              <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {restoreResult === 'success' && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
            ✓ Subscription restored! You now have full access.
          </div>
        )}
        {restoreResult === 'not_found' && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            No active subscription found for this Apple ID.
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handlePurchase}
            disabled={purchasing || (isNative && !ready)}
            className="w-full h-14 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-base"
          >
            {purchasing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
            ) : (isNative && !ready) ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading…</>
            ) : isNative && product ? (
              `Subscribe · ${priceLabel} / month`
            ) : isNative ? (
              'Subscribe to Crew Club'
            ) : (
              'Subscribe to Crew Club'
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleRestore}
            disabled={restoring}
            className="w-full text-slate-400 hover:text-white"
          >
            {restoring ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Restoring…</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Restore Purchases</>
            )}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4 leading-relaxed px-1">
          Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage or cancel your subscription in your App Store account settings.
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a
            href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-500 underline"
          >
            Terms of Use
          </a>
          <span className="text-slate-600 text-xs">·</span>
          <a
            href="https://sailingdoodles.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-500 underline"
          >
            Privacy Policy
          </a>
        </div>
      </SheetContent>
      <IAPDebugPanel />
    </Sheet>
  );
}