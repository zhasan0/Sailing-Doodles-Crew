import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

async function fetchAllPatronEmails(accessToken) {
    let allEmails = [];
    let nextPage = null;
    let attempt = 0;
    const maxAttempts = 15;

    while (attempt < maxAttempts) {
        const url = nextPage
            ? `https://www.patreon.com/api/oauth2/v2${nextPage}`
            : 'https://www.patreon.com/api/oauth2/v2/campaigns/542139/members?include=user&fields[member]=patron_status&fields[user]=email';

        if (attempt > 0) await new Promise(r => setTimeout(r, 2000));

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) throw new Error(`Patreon API error: ${response.status}`);

        const data = await response.json();

        const userMap = new Map();
        if (data.included) {
            data.included.forEach(u => {
                if (u.type === 'user' && u.attributes.email) {
                    userMap.set(u.id, u.attributes.email.toLowerCase());
                }
            });
        }

        if (data.data) {
            for (const member of data.data) {
                if (member.attributes.patron_status === 'active_patron') {
                    const email = userMap.get(member.relationships?.user?.data?.id);
                    if (email) allEmails.push(email);
                }
            }
        }

        const next = data.links?.next;
        nextPage = next ? new URL(next).pathname + new URL(next).search : null;
        if (!nextPage) break;
        attempt++;
    }

    return allEmails;
}

async function isActiveInDatabases(base44, emailToCheck) {
    const [patronRecords, podiaRecords] = await Promise.all([
        base44.asServiceRole.entities.PatronEmail.list(),
        base44.asServiceRole.entities.PodiaEmail.list()
    ]);

    const activePatron = patronRecords.some(p =>
        p.email.toLowerCase() === emailToCheck &&
        (p.status === 'active' || p.status === 'Active patron')
    );
    const activePodia = podiaRecords.some(p =>
        p.email.toLowerCase() === emailToCheck &&
        (p.status === 'active' || p.status === 'Active')
    );

    if (activePatron) return { active: true, source: 'patreon_database' };
    if (activePodia) return { active: true, source: 'podia_database' };
    return { active: false };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();

        if (!currentUser?.email) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        // Use provided patreon_email, or fall back to saved one, or account email
        const rawEmail = (body.patreon_email || currentUser.patreon_email || currentUser.email).trim().toLowerCase();

        // Abuse prevention: if the email differs from account email, check it's not already used by another account
        if (rawEmail !== currentUser.email.toLowerCase()) {
            const allUsers = await base44.asServiceRole.entities.User.list();
            const conflict = allUsers.find(u =>
                u.email !== currentUser.email &&
                u.patreon_email?.toLowerCase() === rawEmail
            );
            if (conflict) {
                return Response.json({
                    error: 'This Patreon email is already linked to another Sailing Doodles account. Please contact support.',
                    conflict: true
                }, { status: 409 });
            }
        }

        // Check local databases first (fast)
        const dbResult = await isActiveInDatabases(base44, rawEmail);

        if (dbResult.active) {
            await base44.auth.updateMe({
                membership_status: 'active',
                patreon_email: rawEmail,
                membership_verified_at: new Date().toISOString()
            });
            return Response.json({ activated: true, source: dbResult.source, patreon_email: rawEmail });
        }

        // Fallback: check Patreon API (with cache)
        const accessToken = Deno.env.get('PATREON_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'Patreon token not configured' }, { status: 500 });
        }

        // Try cache
        const CACHE_DURATION_MS = 10 * 60 * 1000;
        let patronEmails = null;
        const cache = await base44.asServiceRole.entities.AppSettings.filter({ key: 'patron_emails_cache' });
        if (cache.length > 0) {
            const cacheData = JSON.parse(cache[0].value);
            if (Date.now() - cacheData.timestamp < CACHE_DURATION_MS) {
                patronEmails = cacheData.emails;
            }
        }

        if (!patronEmails) {
            patronEmails = await fetchAllPatronEmails(accessToken);
            const cacheData = { emails: patronEmails, timestamp: Date.now() };
            if (cache.length > 0) {
                await base44.asServiceRole.entities.AppSettings.update(cache[0].id, { value: JSON.stringify(cacheData) });
            } else {
                await base44.asServiceRole.entities.AppSettings.create({ key: 'patron_emails_cache', value: JSON.stringify(cacheData) });
            }
        }

        if (patronEmails.includes(rawEmail)) {
            await base44.auth.updateMe({
                membership_status: 'active',
                patreon_email: rawEmail,
                membership_verified_at: new Date().toISOString()
            });
            return Response.json({ activated: true, source: 'patreon_api', patreon_email: rawEmail });
        }

        // Not found — save email anyway (user may have entered it intentionally), but don't activate
        if (body.patreon_email) {
            await base44.auth.updateMe({ patreon_email: rawEmail });
        }

        return Response.json({
            activated: false,
            message: `No active Patreon or Podia membership found for ${rawEmail}.`,
            patreon_email: rawEmail
        });

    } catch (error) {
        console.error('verifyMembership error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});