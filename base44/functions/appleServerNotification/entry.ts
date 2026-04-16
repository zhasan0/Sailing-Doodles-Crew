// App Store Server Notifications (ASSN) handler
// Configure this URL in App Store Connect → My Apps → App Information → App Store Server Notifications
// URL: https://[your-app].base44.app/api/functions/appleServerNotification
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

// Notification types that mean subscription is still active
const ACTIVE_TYPES = new Set([
  'INITIAL_BUY',
  'DID_RENEW',
  'DID_RECOVER',
  'INTERACTIVE_RENEWAL',
  'CONSUMPTION_REQUEST',
]);

// Notification types that mean subscription has ended or is in trouble
const INACTIVE_TYPES = new Set([
  'CANCEL',
  'DID_FAIL_TO_RENEW',
  'REFUND',
]);

// EXPIRED is its own type
const EXPIRED_TYPE = 'EXPIRED';

Deno.serve(async (req) => {
  try {
    // Apple sends a JSON POST with { signedPayload } (V2) or { unified_receipt, notification_type } (V1)
    const body = await req.json();
    console.log('[ASSN] Received notification:', JSON.stringify(body).substring(0, 200));

    // --- Handle V2 signed payload ---
    if (body.signedPayload) {
      // V2: JWT-encoded payload. Decode the middle segment (no verification needed for basic use).
      const parts = body.signedPayload.split('.');
      if (parts.length < 2) {
        return Response.json({ error: 'Invalid signedPayload' }, { status: 400 });
      }
      const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadStr);
      const notificationType = payload.notificationType; // e.g. "DID_RENEW", "EXPIRED"
      const subtype = payload.subtype; // e.g. "VOLUNTARY" for cancellation
      console.log('[ASSN V2] type=' + notificationType + ' subtype=' + subtype);

      // Decode the transactionInfo to get the original transaction ID
      let originalTransactionId = null;
      let expiresMs = null;
      if (payload.data && payload.data.signedTransactionInfo) {
        const txParts = payload.data.signedTransactionInfo.split('.');
        if (txParts.length >= 2) {
          const txStr = atob(txParts[1].replace(/-/g, '+').replace(/_/g, '/'));
          const tx = JSON.parse(txStr);
          originalTransactionId = tx.originalTransactionId;
          expiresMs = tx.expiresDate;
        }
      }

      if (!originalTransactionId) {
        console.log('[ASSN V2] No originalTransactionId found');
        return Response.json({ ok: true });
      }

      // Find the user with this original transaction ID
      const base44 = createClientFromRequest(req);
      const users = await base44.asServiceRole.entities.User.filter({
        apple_original_transaction_id: originalTransactionId
      });

      if (users.length === 0) {
        console.log('[ASSN V2] No user found for transaction: ' + originalTransactionId);
        return Response.json({ ok: true });
      }

      const user = users[0];
      const isActive = ACTIVE_TYPES.has(notificationType);
      const isExpired = notificationType === EXPIRED_TYPE || INACTIVE_TYPES.has(notificationType);

      if (isActive) {
        const expiresDate = expiresMs ? new Date(expiresMs).toISOString() : null;
        await base44.asServiceRole.entities.User.update(user.id, {
          membership_status: 'active',
          apple_subscription_active: true,
          apple_subscription_expires: expiresDate,
        });
        console.log('[ASSN V2] Activated user: ' + user.email);
      } else if (isExpired) {
        // Only deactivate if their source was apple
        if (user.membership_source === 'apple') {
          await base44.asServiceRole.entities.User.update(user.id, {
            membership_status: 'inactive',
            apple_subscription_active: false,
          });
          console.log('[ASSN V2] Deactivated user: ' + user.email + ' reason: ' + notificationType);
        }
      }

      return Response.json({ ok: true });
    }

    // --- Handle V1 unified_receipt ---
    const notificationType = body.notification_type;
    const unifiedReceipt = body.unified_receipt;
    const latestReceiptInfo = unifiedReceipt?.latest_receipt_info?.[0];
    const originalTransactionId = latestReceiptInfo?.original_transaction_id;
    const latestReceipt = unifiedReceipt?.latest_receipt;

    console.log('[ASSN V1] type=' + notificationType + ' txId=' + originalTransactionId);

    if (!originalTransactionId) {
      return Response.json({ ok: true });
    }

    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities.User.filter({
      apple_original_transaction_id: originalTransactionId
    });

    if (users.length === 0) {
      console.log('[ASSN V1] No user found for transaction: ' + originalTransactionId);
      return Response.json({ ok: true });
    }

    const user = users[0];
    const isActive = ACTIVE_TYPES.has(notificationType);
    const isExpired = notificationType === EXPIRED_TYPE || INACTIVE_TYPES.has(notificationType);

    if (isActive) {
      const expiresMs = latestReceiptInfo?.expires_date_ms;
      const expiresDate = expiresMs ? new Date(parseInt(expiresMs, 10)).toISOString() : null;
      await base44.asServiceRole.entities.User.update(user.id, {
        membership_status: 'active',
        apple_subscription_active: true,
        apple_subscription_expires: expiresDate,
        apple_latest_receipt: latestReceipt || user.apple_latest_receipt,
      });
      console.log('[ASSN V1] Activated user: ' + user.email);
    } else if (isExpired) {
      if (user.membership_source === 'apple') {
        await base44.asServiceRole.entities.User.update(user.id, {
          membership_status: 'inactive',
          apple_subscription_active: false,
        });
        console.log('[ASSN V1] Deactivated user: ' + user.email);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[ASSN] Error:', error.message);
    // Always return 200 to Apple or they will retry
    return Response.json({ ok: true, error: error.message });
  }
});