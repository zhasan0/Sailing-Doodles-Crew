import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const newUserEmail = payload?.email || payload?.data?.email;
    const newUserName = payload?.name || payload?.data?.full_name || payload?.data?.display_name || 'Member';

    if (!newUserEmail) {
      return Response.json({ error: 'No user email in payload' }, { status: 400 });
    }

    // Get the first admin user
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admin = allUsers.find(u => u.role === 'admin');

    if (!admin) {
      return Response.json({ error: 'No admin found' }, { status: 404 });
    }

    // Don't friend the admin with themselves
    if (admin.email === newUserEmail) {
      return Response.json({ skipped: true, reason: 'same user' });
    }

    // Check if friendship already exists
    const [existing1, existing2] = await Promise.all([
      base44.asServiceRole.entities.FriendRequest.filter({ sender_email: admin.email, receiver_email: newUserEmail }),
      base44.asServiceRole.entities.FriendRequest.filter({ sender_email: newUserEmail, receiver_email: admin.email }),
    ]);

    if (existing1.length > 0 || existing2.length > 0) {
      return Response.json({ skipped: true, reason: 'already friends' });
    }

    // Create accepted friendship
    await base44.asServiceRole.entities.FriendRequest.create({
      sender_email: admin.email,
      sender_name: admin.full_name || admin.display_name || 'Admin',
      receiver_email: newUserEmail,
      receiver_name: newUserName,
      status: 'accepted',
    });

    return Response.json({ success: true, admin: admin.email, newUser: newUserEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});