import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const payload = await req.json();
    const livestream = payload.data;
    
    // Get all users - treat missing preference as opted-in (true by default)
    const users = await base44.asServiceRole.entities.User.list();
    
    // Send email to each user
    for (const user of users) {
      if (user.email && user.notify_livestream !== false) {
        const appUrl = `https://crew.sailingdoodles.com/Livestreams`;
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `🔴 Live: ${livestream.title}`,
          body: `Hey ${user.display_name}!\n\nWe're going live!\n\n${livestream.title}\n\n${livestream.note || ''}\n\nJoin us now: ${appUrl}`
        });
      }
    }
    
    return Response.json({ sent: users.length });
  } catch (error) {
    console.error('Error sending livestream emails:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});