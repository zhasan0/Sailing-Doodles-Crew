import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getStoredToken(base44) {
  const settings = await base44.asServiceRole.entities.AppSettings.filter({ key: 'patreon_access_token' });
  return settings[0]?.value || null;
}

async function saveToken(base44, token) {
  const existing = await base44.asServiceRole.entities.AppSettings.filter({ key: 'patreon_access_token' });
  if (existing.length > 0) {
    await base44.asServiceRole.entities.AppSettings.update(existing[0].id, { value: token });
  } else {
    await base44.asServiceRole.entities.AppSettings.create({ key: 'patreon_access_token', value: token });
  }
}

export async function getPatreonToken(base44) {
  // Try to get stored token first
  let token = await getStoredToken(base44);
  
  // If no stored token, use env token and store it
  if (!token) {
    token = Deno.env.get('PATREON_ACCESS_TOKEN');
    if (token) {
      await saveToken(base44, token);
    }
  }
  
  return token;
}

export async function refreshPatreonToken(base44) {
  const refreshToken = Deno.env.get('PATREON_REFRESH_TOKEN');
  const clientId = Deno.env.get('PATREON_CLIENT_ID');
  const clientSecret = Deno.env.get('PATREON_CLIENT_SECRET');

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Missing Patreon OAuth credentials for token refresh');
  }

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

  // Store the new token
  await saveToken(base44, newToken);

  return newToken;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const newToken = await refreshPatreonToken(base44);

    return Response.json({
      success: true,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Refresh error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});