import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mentionedEmails, authorName } = await req.json();

    if (!mentionedEmails || !Array.isArray(mentionedEmails)) {
      return Response.json({ error: 'Invalid mentionedEmails' }, { status: 400 });
    }

    const keyId = Deno.env.get('APNS_KEY_ID');
    const teamId = Deno.env.get('APNS_TEAM_ID');
    const authKey = Deno.env.get('APNS_AUTH_KEY');

    if (!keyId || !teamId || !authKey) {
      return Response.json({ error: 'APNs credentials not configured' }, { status: 500 });
    }

    // Generate JWT token for APNs
    const header = {
      alg: 'ES256',
      kid: keyId
    };

    const payload = {
      iss: teamId,
      iat: Math.floor(Date.now() / 1000)
    };

    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const pemKey = authKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signatureData = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      signatureData
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwtToken = `${headerB64}.${payloadB64}.${signatureB64}`;

    const results = [];
    const bundleId = 'com.base6998cc8da86f841249914a41.app';

    // Send push to each mentioned user
    for (const email of mentionedEmails) {
      // Check if user has push notifications enabled
      const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ 
        user_email: email, 
        notification_type: 'new_message' 
      });
      
      if (prefs.length > 0 && !prefs[0].push_enabled) {
        continue; // Skip if push disabled
      }

      const tokens = await base44.asServiceRole.entities.DeviceToken.filter({ user_email: email });
      const iosTokens = tokens.filter(t => t.device_type === 'ios');

      for (const tokenRecord of iosTokens) {
        const apnsPayload = {
          aps: {
            alert: {
              title: 'New mention in chat',
              body: `${authorName} mentioned you in chat`
            },
            sound: 'default',
            badge: 1
          },
          type: 'chat_mention'
        };

        const response = await fetch(
          `https://api.push.apple.com/3/device/${tokenRecord.token}`,
          {
            method: 'POST',
            headers: {
              'authorization': `bearer ${jwtToken}`,
              'apns-topic': bundleId,
              'apns-push-type': 'alert',
              'apns-priority': '10'
            },
            body: JSON.stringify(apnsPayload)
          }
        );

        results.push({
          email,
          token: tokenRecord.token,
          status: response.status,
          success: response.status === 200
        });

        if (response.status !== 200) {
          const error = await response.text();
          console.error(`Failed to send to ${tokenRecord.token}:`, error);
        }
      }
    }

    return Response.json({ 
      success: true, 
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results 
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});