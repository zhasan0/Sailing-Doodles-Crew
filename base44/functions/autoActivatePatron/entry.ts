import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

async function getCachedPatronEmails(base44) {
    const cache = await base44.asServiceRole.entities.AppSettings.filter({ key: 'patron_emails_cache' });
    if (cache.length > 0) {
        const cacheData = JSON.parse(cache[0].value);
        const now = Date.now();
        if (now - cacheData.timestamp < CACHE_DURATION_MS) {
            console.log('Using cached patron emails');
            return cacheData.emails;
        }
    }
    return null;
}

async function setCachedPatronEmails(base44, emails) {
    const cacheData = {
        emails,
        timestamp: Date.now()
    };
    const existing = await base44.asServiceRole.entities.AppSettings.filter({ key: 'patron_emails_cache' });
    if (existing.length > 0) {
        await base44.asServiceRole.entities.AppSettings.update(existing[0].id, { value: JSON.stringify(cacheData) });
    } else {
        await base44.asServiceRole.entities.AppSettings.create({ key: 'patron_emails_cache', value: JSON.stringify(cacheData) });
    }
}

async function fetchAllPatronEmails(accessToken) {
    let allEmails = [];
    let nextPage = null;
    let attempt = 0;
    const maxAttempts = 15;

    while (attempt < maxAttempts) {
        const url = nextPage ? `https://www.patreon.com/api/oauth2/v2${nextPage}` : 'https://www.patreon.com/api/oauth2/v2/campaigns/542139/members?include=user&fields[member]=patron_status&fields[user]=email';
        
        if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay between pages
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Patreon API error: ${response.status}`);
        }

        const data = await response.json();
        
        const userMap = new Map();
        if (data.included) {
            data.included.forEach(user => {
                if (user.type === 'user' && user.attributes.email) {
                    userMap.set(user.id, user.attributes.email.toLowerCase());
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

        nextPage = data.links?.next ? new URL(data.links.next).pathname + new URL(data.links.next).search : null;
        if (!nextPage) break;
        attempt++;
    }

    return allEmails;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user?.email) {
            return Response.json({ error: 'No email provided' }, { status: 400 });
        }

        if (user.membership_status === 'active' || user.role === 'admin') {
            return Response.json({ message: 'User already active or is admin', skipped: true });
        }

        // Priority: use saved patreon_email if set, otherwise use account email
        const emailToCheck = (user.patreon_email || user.email).toLowerCase();
        console.log(`Checking membership for ${emailToCheck} (account: ${user.email})`);

        // Check both PatronEmail and PodiaEmail databases (instant lookup)
        const [patronRecords, podiaRecords] = await Promise.all([
            base44.asServiceRole.entities.PatronEmail.list(),
            base44.asServiceRole.entities.PodiaEmail.list()
        ]);
        
        const activePatron = patronRecords.find(p => 
            p.email.toLowerCase() === emailToCheck && (p.status === 'active' || p.status === 'Active patron')
        );
        const activePodia = podiaRecords.find(p => 
            p.email.toLowerCase() === emailToCheck && (p.status === 'active' || p.status === 'Active')
        );
        
        if (activePatron) {
            console.log(`User found in PatronEmail database via ${emailToCheck}`);
            await base44.auth.updateMe({ membership_status: 'active', patreon_email: emailToCheck, membership_verified_at: new Date().toISOString() });
            return Response.json({ activated: true, source: 'patreon_database' });
        }
        
        if (activePodia) {
            console.log(`User found in PodiaEmail database via ${emailToCheck}`);
            await base44.auth.updateMe({ membership_status: 'active', patreon_email: emailToCheck, membership_verified_at: new Date().toISOString() });
            return Response.json({ activated: true, source: 'podia_database' });
        }

        // Fallback: check cache or fetch from Patreon API
        const accessToken = Deno.env.get('PATREON_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'Patreon token not configured' }, { status: 500 });
        }

        let patronEmails = await getCachedPatronEmails(base44);
        if (!patronEmails) {
            console.log('Cache miss, fetching patron emails from Patreon');
            patronEmails = await fetchAllPatronEmails(accessToken);
            await setCachedPatronEmails(base44, patronEmails);
        }

        if (patronEmails.includes(emailToCheck)) {
            console.log(`User found as active patron via API (${emailToCheck})`);
            await base44.auth.updateMe({ membership_status: 'active', patreon_email: emailToCheck, membership_verified_at: new Date().toISOString() });
            return Response.json({ activated: true, source: 'api' });
        }

        console.log(`No active membership found for ${emailToCheck}`);
        return Response.json({ activated: false, message: 'No active membership found' });

    } catch (error) {
        console.error('Error in autoActivatePatron:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});