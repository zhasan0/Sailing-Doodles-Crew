// Daily scheduled job: re-validates stored Apple receipts for all Apple subscribers
// Deactivates users whose subscriptions have expired
// Triggered by a scheduled automation — runs once daily
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SHARED_SECRET = Deno.env.get('APPLE_IAP_SHARED_SECRET');
const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

async function verifyReceipt(receiptData, useSandbox = false) {
  const url = useSandbox ? SANDBOX_URL : PRODUCTION_URL;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password: SHARED_SECRET,
      'exclude-old-transactions': true,
    }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only or scheduled call (no user context for scheduled automations)
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch {
      // Scheduled calls have no user — allow via service role
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find all users with Apple subscriptions that have a stored receipt
    const allUsers = await base44.asServiceRole.entities.User.filter({
      membership_source: 'apple',
    });

    const appleUsers = allUsers.filter(u => u.apple_latest_receipt);
    console.log('[REVALIDATE] Found ' + appleUsers.length + ' Apple subscribers with stored receipts');

    const now = Date.now();
    let activated = 0, deactivated = 0, skipped = 0;

    for (const user of appleUsers) {
      try {
        let result = await verifyReceipt(user.apple_latest_receipt, false);
        if (result.status === 21007) {
          result = await verifyReceipt(user.apple_latest_receipt, true);
        }

        if (result.status !== 0) {
          console.log('[REVALIDATE] Receipt invalid for ' + user.email + ' status=' + result.status);
          skipped++;
          continue;
        }

        const latestReceipts = result.latest_receipt_info || [];
        const activeSubscription = latestReceipts.find(r => {
          return parseInt(r.expires_date_ms, 10) > now;
        });

        const isActive = !!activeSubscription;

        if (isActive && user.membership_status !== 'active') {
          const expiresDate = new Date(parseInt(activeSubscription.expires_date_ms, 10)).toISOString();
          await base44.asServiceRole.entities.User.update(user.id, {
            membership_status: 'active',
            apple_subscription_active: true,
            apple_subscription_expires: expiresDate,
            // Update stored receipt with latest from Apple
            apple_latest_receipt: result.latest_receipt || user.apple_latest_receipt,
          });
          activated++;
          console.log('[REVALIDATE] Re-activated: ' + user.email);
        } else if (!isActive && user.membership_status === 'active') {
          await base44.asServiceRole.entities.User.update(user.id, {
            membership_status: 'inactive',
            apple_subscription_active: false,
          });
          deactivated++;
          console.log('[REVALIDATE] Deactivated expired subscription: ' + user.email);
        } else {
          skipped++;
        }

        // Small delay to avoid hammering Apple API
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error('[REVALIDATE] Error processing ' + user.email + ': ' + err.message);
        skipped++;
      }
    }

    const summary = { activated, deactivated, skipped, total: appleUsers.length };
    console.log('[REVALIDATE] Done:', JSON.stringify(summary));
    return Response.json(summary);
  } catch (error) {
    console.error('[REVALIDATE] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});