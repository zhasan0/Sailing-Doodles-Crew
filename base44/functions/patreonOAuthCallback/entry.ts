import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      // Generate OAuth URL
      const clientId = Deno.env.get('PATREON_CLIENT_ID');
      const redirectUri = `${url.origin}/functions/patreonOAuthCallback`;
      const authUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=identity%20identity[email]%20campaigns%20campaigns.members`;
      
      return Response.json({ 
        oauth_url: authUrl,
        message: 'Visit this URL to authorize'
      });
    }

    // Exchange code for tokens
    const clientId = Deno.env.get('PATREON_CLIENT_ID');
    const clientSecret = Deno.env.get('PATREON_CLIENT_SECRET');
    const redirectUri = `${url.origin}/functions/patreonOAuthCallback`;

    const response = await fetch('https://www.patreon.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Store tokens in AppSettings
    const accessTokenSetting = await base44.asServiceRole.entities.AppSettings.filter({ key: 'patreon_access_token' });
    if (accessTokenSetting.length > 0) {
      await base44.asServiceRole.entities.AppSettings.update(accessTokenSetting[0].id, { value: data.access_token });
    } else {
      await base44.asServiceRole.entities.AppSettings.create({ key: 'patreon_access_token', value: data.access_token });
    }

    return new Response(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: green;">✓ Success!</h1>
          <p>Patreon tokens have been refreshed and saved.</p>
          <p>You can close this window and return to the admin panel.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('OAuth error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});