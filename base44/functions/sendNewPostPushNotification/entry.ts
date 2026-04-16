import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

async function buildJWT(keyId, teamId, authKey) {
  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };
  const enc = new TextEncoder();
  const b64 = s => btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const headerB64 = b64(JSON.stringify(header));
  const payloadB64 = b64(JSON.stringify(payload));
  const pemKey = authKey.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, enc.encode(`${headerB64}.${payloadB64}`));
  const sigB64 = b64(String.fromCharCode(...new Uint8Array(sig)));
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

async function sendAPNS(jwt, token, title, body, data = {}) {
  const bundleId = 'com.base6998cc8da86f841249914a41.app';
  const res = await fetch(`https://api.push.apple.com/3/device/${token}`, {
    method: 'POST',
    headers: { 'authorization': `bearer ${jwt}`, 'apns-topic': bundleId, 'apns-push-type': 'alert', 'apns-priority': '10' },
    body: JSON.stringify({ aps: { alert: { title, body }, sound: 'default', badge: 1 }, ...data })
  });
  if (!res.ok) console.error(`APNS failed for ${token}:`, await res.text());
  return res.ok;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { post_id } = await req.json();

    const posts = await base44.asServiceRole.entities.Post.filter({ id: post_id });
    if (!posts[0]) return Response.json({ error: 'Post not found' }, { status: 404 });
    const post = posts[0];

    const keyId = Deno.env.get('APNS_KEY_ID');
    const teamId = Deno.env.get('APNS_TEAM_ID');
    const authKey = Deno.env.get('APNS_AUTH_KEY');
    if (!keyId || !teamId || !authKey) return Response.json({ error: 'APNs credentials not configured' }, { status: 500 });

    const jwt = await buildJWT(keyId, teamId, authKey);
    const allTokens = await base44.asServiceRole.entities.DeviceToken.list();
    const iosTokens = allTokens.filter(t => t.device_type === 'ios' && t.user_email !== post.created_by);

    let sent = 0;
    for (const t of iosTokens) {
      const ok = await sendAPNS(jwt, t.token, `New Post: ${post.title}`, post.body ? post.body.substring(0, 100) : 'Check it out!', { type: 'new_post', post_id });
      if (ok) sent++;
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});