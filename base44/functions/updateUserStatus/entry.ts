import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, status } = await req.json();

    if (!userId || !status) {
      return Response.json({ error: 'Missing userId or status' }, { status: 400 });
    }

    const user = await base44.asServiceRole.entities.User.get(userId);
    await base44.asServiceRole.entities.User.update(userId, { 
      data: { ...user.data, membership_status: status }
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Update user status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});