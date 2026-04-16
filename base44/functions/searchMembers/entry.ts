import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to list users (bypasses User list permission restriction)
    const allUsers = await base44.asServiceRole.entities.User.list();

    // Return only safe public fields, excluding self
    const members = allUsers
      .filter(u => u.email !== me.email)
      .map(u => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        full_name: u.full_name,
        bio: u.bio,
        avatar_url: u.avatar_url,
        membership_status: u.membership_status,
        role: u.role,
      }));

    return Response.json({ members });
  } catch (err) {
    console.error('searchMembers error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});