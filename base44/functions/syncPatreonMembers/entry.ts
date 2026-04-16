import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getStoredToken(base44) {
  const settings = await base44.asServiceRole.entities.AppSettings.filter({ key: 'patreon_access_token' });
  return settings[0]?.value || Deno.env.get('PATREON_ACCESS_TOKEN');
}

async function saveToken(base44, token) {
  const existing = await base44.asServiceRole.entities.AppSettings.filter({ key: 'patreon_access_token' });
  if (existing.length > 0) {
    await base44.asServiceRole.entities.AppSettings.update(existing[0].id, { value: token });
  } else {
    await base44.asServiceRole.entities.AppSettings.create({ key: 'patreon_access_token', value: token });
  }
}

async function refreshPatreonToken(base44) {
  const refreshToken = Deno.env.get('PATREON_REFRESH_TOKEN');
  const clientId = Deno.env.get('PATREON_CLIENT_ID');
  const clientSecret = Deno.env.get('PATREON_CLIENT_SECRET');

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Missing Patreon OAuth credentials for token refresh');
  }

  console.log('Refreshing Patreon token...');

  const response = await fetch('https://www.patreon.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const newToken = data.access_token;

  await saveToken(base44, newToken);
  console.log('Token refreshed and saved successfully');

  return newToken;
}

async function fetchPatreonAPI(url, token) {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get current token (from DB or env)
    let accessToken = await getStoredToken(base44);
    if (!accessToken) {
      return Response.json({ error: 'PATREON_ACCESS_TOKEN not set' }, { status: 500 });
    }

    // Get campaign ID first
    let campaignResponse = await fetchPatreonAPI('https://www.patreon.com/api/oauth2/v2/campaigns', accessToken);
    
    // If token is expired, refresh it and retry
    if (campaignResponse.status === 401) {
      console.log('Token expired, refreshing before fetching campaigns...');
      accessToken = await refreshPatreonToken(base44);
      campaignResponse = await fetchPatreonAPI('https://www.patreon.com/api/oauth2/v2/campaigns', accessToken);
    }
    
    if (!campaignResponse.ok) {
      return Response.json({ 
        error: `Patreon API error: ${campaignResponse.status} - Token refresh may have failed` 
      }, { status: 500 });
    }
    
    const campaignData = await campaignResponse.json();
    const campaignId = campaignData.data?.[0]?.id;

    if (!campaignId) {
      return Response.json({ error: 'No campaign found for this Patreon account' }, { status: 404 });
    }

    // Get all members
    let allMembers = [];
    let nextUrl = `https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/members?include=user&fields[member]=patron_status,email&fields[user]=email`;

    while (nextUrl) {
      // Add delay between pagination requests to avoid rate limiting
      if (allMembers.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      let response = await fetchPatreonAPI(nextUrl, accessToken);
      let retries = 0;
      const maxRetries = 5;
      
      while (!response.ok && retries < maxRetries) {
        if (response.status === 429) {
          const waitTime = Math.pow(2, retries) * 5000; // exponential backoff: 5s, 10s, 20s, 40s, 80s
          console.log(`Rate limited, waiting ${waitTime}ms before retry ${retries + 1}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          response = await fetchPatreonAPI(nextUrl, accessToken);
          retries++;
        } else if (response.status === 401) {
          console.log('Token expired, refreshing...');
          accessToken = await refreshPatreonToken(base44);
          response = await fetchPatreonAPI(nextUrl, accessToken);
          break;
        } else {
          break;
        }
      }
      
      if (!response.ok) {
        return Response.json({ 
          error: `Failed to fetch members: ${response.status}` 
        }, { status: 500 });
      }
      
      const data = await response.json();
      
      if (data.data) {
        allMembers = allMembers.concat(data.data);
      }
      
      nextUrl = data.links?.next || null;
    }

    // Extract active patron emails
    const activeEmails = allMembers
      .filter(member => member.attributes.patron_status === 'active_patron')
      .map(member => member.attributes.email)
      .filter(email => email);

    console.log('Total members fetched:', allMembers.length);
    console.log('Active patrons:', activeEmails.length);
    console.log('Sample active emails:', activeEmails.slice(0, 5));

    // Update users in database
    const users = await base44.asServiceRole.entities.User.list();
    let activated = 0;
    let deactivated = 0;

    console.log('Total users in database:', users.length);

    for (const user of users) {
      const shouldBeActive = activeEmails.includes(user.email);
      // Handle nested data structure
      const currentStatus = user.data?.data?.membership_status || user.data?.membership_status;
      const isActive = currentStatus === 'active';

      console.log(`User: ${user.email}, shouldBeActive: ${shouldBeActive}, isActive: ${isActive}`);

      if (shouldBeActive && !isActive) {
        await base44.asServiceRole.entities.User.update(user.id, {
          membership_status: 'active'
        });
        activated++;
        console.log(`Activated: ${user.email}`);
      } else if (!shouldBeActive && isActive && user.role !== 'admin') {
        await base44.asServiceRole.entities.User.update(user.id, {
          membership_status: 'inactive'
        });
        deactivated++;
        console.log(`Deactivated: ${user.email}`);
      }
    }

    console.log(`Final counts - Activated: ${activated}, Deactivated: ${deactivated}`);

    return Response.json({
      success: true,
      total_patrons: activeEmails.length,
      activated,
      deactivated
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});