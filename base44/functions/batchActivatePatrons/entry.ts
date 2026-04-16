import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all inactive users
    const inactiveUsers = await base44.asServiceRole.entities.User.filter({ membership_status: 'inactive' });
    
    if (inactiveUsers.length === 0) {
      return Response.json({ message: 'No inactive users to check', activated_count: 0 });
    }

    let activatedCount = 0;
    const inactiveEmails = inactiveUsers.map(u => u.email.toLowerCase());

    // Get all active patrons and Podia members (check all records, filter by status)
    const [allPatrons, allPodiaMembers] = await Promise.all([
      base44.asServiceRole.entities.PatronEmail.list(),
      base44.asServiceRole.entities.PodiaEmail.list()
    ]);

    const activePatronEmails = new Set(
      allPatrons
        .filter(p => p.status === 'active' || p.status === 'Active patron')
        .map(p => p.email.toLowerCase())
    );
    const activePodiaEmails = new Set(
      allPodiaMembers
        .filter(p => p.status === 'active' || p.status === 'Active')
        .map(p => p.email.toLowerCase())
    );

    // Activate matching users
    for (const inactiveUser of inactiveUsers) {
      const userEmail = inactiveUser.email.toLowerCase();
      if (activePatronEmails.has(userEmail) || activePodiaEmails.has(userEmail)) {
        await base44.asServiceRole.entities.User.update(inactiveUser.id, { membership_status: 'active' });
        activatedCount++;
        console.log(`Activated user: ${userEmail}`);
      }
    }

    return Response.json({ 
      message: `Batch activation complete`,
      total_checked: inactiveUsers.length,
      activated_count: activatedCount
    });

  } catch (error) {
    console.error('Batch activation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});