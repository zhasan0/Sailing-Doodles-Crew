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
  const bundleId = 'com.sailingdoodles.app';
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
    const payload = await req.json();
    const message = payload.data;

    if (!message?.conversation_id || !message?.sender_email) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Get conversation to find recipient
    const convos = await base44.asServiceRole.entities.DMConversation.filter({ id: message.conversation_id });
    if (!convos[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });
    const convo = convos[0];

    // Determine recipient
    const recipientEmail = convo.participant1_email === message.sender_email
      ? convo.participant2_email
      : convo.participant1_email;

    const senderName = message.sender_name || 'Someone';

    // Get recipient user for email
    const recipients = await base44.asServiceRole.entities.User.filter({ email: recipientEmail });
    const recipient = recipients[0];

    // Send push notification
    const keyId = Deno.env.get('APNS_KEY_ID');
    const teamId = Deno.env.get('APNS_TEAM_ID');
    const authKey = Deno.env.get('APNS_AUTH_KEY');

    let pushSent = 0;
    if (keyId && teamId && authKey) {
      const jwt = await buildJWT(keyId, teamId, authKey);
      const tokens = await base44.asServiceRole.entities.DeviceToken.filter({ user_email: recipientEmail });
      const iosTokens = tokens.filter(t => t.device_type === 'ios');
      for (const t of iosTokens) {
        const ok = await sendAPNS(jwt, t.token, `New message from ${senderName}`, message.text?.substring(0, 100) || 'Sent you a message', { type: 'dm', conversation_id: message.conversation_id });
        if (ok) pushSent++;
      }
    }

    // Send email notification unless user has explicitly opted out
    let emailSent = false;
    if (recipient && recipient.notify_messages !== false) {
      const appUrl = 'https://crew.sailingdoodles.com/Messages';
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `New message from ${senderName}`,
        body: `Hey ${recipient.display_name || recipient.full_name}!\n\n${senderName} sent you a message:\n\n"${message.text?.substring(0, 200) || '(image)'}"\n\nReply here: ${appUrl}`
      });
      emailSent = true;
    }

    return Response.json({ success: true, pushSent, emailSent });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});