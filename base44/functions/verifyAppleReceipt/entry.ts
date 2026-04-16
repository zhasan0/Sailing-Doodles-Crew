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
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { receipt } = await req.json();
    if (!receipt) return Response.json({ error: 'No receipt provided' }, { status: 400 });

    // Try production first, fall back to sandbox (status 21007 = sandbox receipt sent to production)
    let result = await verifyReceipt(receipt, false);
    if (result.status === 21007) {
      result = await verifyReceipt(receipt, true);
    }

    if (result.status !== 0) {
      return Response.json({ active: false, error: `Apple status ${result.status}` });
    }

    // Find the most recent auto-renewable subscription
    const latestReceipts = result.latest_receipt_info || [];
    const now = Date.now();
    const activeSubscription = latestReceipts.find(r => {
      const expiresMs = parseInt(r.expires_date_ms, 10);
      return expiresMs > now;
    });

    const isActive = !!activeSubscription;
    const expiresDate = activeSubscription
      ? new Date(parseInt(activeSubscription.expires_date_ms, 10)).toISOString()
      : null;

    // Store original transaction ID and latest receipt for ASSN matching + future revalidation
    const originalTransactionId = activeSubscription?.original_transaction_id
      || (latestReceipts[0]?.original_transaction_id);
    const latestReceipt = result.latest_receipt || receipt;

    // Update user record
    if (isActive) {
      await base44.auth.updateMe({
        membership_status: 'active',
        membership_source: 'apple',
        apple_subscription_active: true,
        apple_subscription_expires: expiresDate,
        apple_original_transaction_id: originalTransactionId,
        apple_latest_receipt: latestReceipt,
      });
    } else {
      // Only deactivate if their source was apple (don't touch Patreon users)
      if (user.membership_source === 'apple') {
        await base44.auth.updateMe({
          membership_status: 'inactive',
          apple_subscription_active: false,
          apple_original_transaction_id: originalTransactionId,
          apple_latest_receipt: latestReceipt,
        });
      } else {
        await base44.auth.updateMe({
          apple_subscription_active: false,
          apple_original_transaction_id: originalTransactionId,
          apple_latest_receipt: latestReceipt,
        });
      }
    }

    return Response.json({ active: isActive, expires: expiresDate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});