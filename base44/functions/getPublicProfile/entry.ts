import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const reqClone = req.clone();
    const base44 = createClientFromRequest(req);

    const me = await base44.auth.me();
    if (!me) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try { body = await reqClone.json(); } catch { body = {}; }
    const email = body?.email;

    if (!email) {
      return Response.json({ error: 'Missing email parameter' }, { status: 400 });
    }

    // Use service role + explicit limit so filter works correctly
    const users = await base44.asServiceRole.entities.User.filter({ email }, '-created_date', 1);
    const u = users?.[0];

    if (!u) {
      return Response.json({ user: null });
    }

    return Response.json({
      user: {
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        full_name: u.full_name,
        bio: u.bio,
        avatar_url: u.avatar_url,
        instagram: u.instagram,
        twitter: u.twitter,
        website: u.website,
        membership_status: u.membership_status,
        role: u.role,
      }
    });
  } catch (err) {
    console.error('getPublicProfile error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});