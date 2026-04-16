import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHmac } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get webhook secret
    const webhookSecret = Deno.env.get('PODIA_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Get request body and signature
    const body = await req.text();
    const signature = req.headers.get('podia-signature');
    
    if (!signature) {
      return Response.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify webhook signature
    const hmac = createHmac('sha256', webhookSecret);
    hmac.update(body);
    const expectedSignature = 'sha256=' + hmac.digest('hex');

    if (signature !== expectedSignature) {
      return Response.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Parse the webhook payload
    const payload = JSON.parse(body);
    const eventType = payload.event_type;

    // Handle different Podia events
    if (eventType === 'subscription.created' || eventType === 'subscription.activated') {
      // New subscription or reactivated
      const memberEmail = payload.customer?.email;

      if (memberEmail) {
        const users = await base44.asServiceRole.entities.User.filter({ email: memberEmail });
        
        if (users.length > 0) {
          const user = users[0];
          await base44.asServiceRole.entities.User.update(user.id, {
            membership_status: 'active'
          });

          return Response.json({ 
            success: true, 
            message: `Activated ${memberEmail}` 
          });
        } else {
          return Response.json({ 
            success: false, 
            message: `User not found: ${memberEmail}` 
          });
        }
      }
    } else if (eventType === 'subscription.cancelled' || eventType === 'subscription.expired') {
      // Subscription cancelled or expired
      const memberEmail = payload.customer?.email;

      if (memberEmail) {
        const users = await base44.asServiceRole.entities.User.filter({ email: memberEmail });
        
        if (users.length > 0) {
          const user = users[0];
          await base44.asServiceRole.entities.User.update(user.id, {
            membership_status: 'inactive'
          });

          return Response.json({ 
            success: true, 
            message: `Deactivated ${memberEmail}` 
          });
        }
      }
    }

    return Response.json({ success: true, event: eventType });

  } catch (error) {
    console.error('Podia webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});