import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const bodyBuffer = await req.arrayBuffer();
  const bodyText = new TextDecoder().decode(bodyBuffer);

  try {
    const webhookSecret = Deno.env.get('PATREON_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const event = req.headers.get('x-patreon-event');
    let payload = {};
    
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    if (event === 'members:pledge:create' || event === 'members:pledge:update') {
      const memberEmail = payload.data?.attributes?.email;
      const pledgeStatus = payload.data?.attributes?.patron_status;

      if (memberEmail) {
        const newStatus = pledgeStatus === 'active_patron' ? 'active' : 'inactive';
        
        const existingPatron = await base44.asServiceRole.entities.PatronEmail.filter({ email: memberEmail });
        if (existingPatron.length > 0) {
          await base44.asServiceRole.entities.PatronEmail.update(existingPatron[0].id, { status: newStatus });
        } else if (newStatus === 'active') {
          await base44.asServiceRole.entities.PatronEmail.create({ email: memberEmail, status: 'active' });
        }
        
        const users = await base44.asServiceRole.entities.User.filter({ email: memberEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, { membership_status: newStatus });
        }

        return Response.json({ success: true, message: `Updated ${memberEmail} to ${newStatus}` });
      }
    } else if (event === 'members:pledge:delete') {
      const memberEmail = payload.data?.attributes?.email;

      if (memberEmail) {
        const existingPatron = await base44.asServiceRole.entities.PatronEmail.filter({ email: memberEmail });
        if (existingPatron.length > 0) {
          await base44.asServiceRole.entities.PatronEmail.delete(existingPatron[0].id);
        }
        
        const users = await base44.asServiceRole.entities.User.filter({ email: memberEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, { membership_status: 'inactive' });
        }

        return Response.json({ success: true, message: `Removed ${memberEmail}` });
      }
    }

    return Response.json({ success: true, event });

  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});