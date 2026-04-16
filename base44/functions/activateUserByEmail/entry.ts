import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userRecord = users[0];
    const updatedData = {
      ...userRecord.data,
      membership_status: 'active'
    };

    await base44.asServiceRole.entities.User.update(userRecord.id, updatedData);

    return Response.json({ success: true, message: `${email} activated` });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});