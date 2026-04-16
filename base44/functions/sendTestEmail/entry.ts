import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { email } = payload;
    
    if (!email) {
      return Response.json({ error: 'Email address required' }, { status: 400 });
    }

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: 'Test Email from Sailing Doodles',
      body: 'This is a test email from the Sailing Doodles notification system. If you received this, emails are working correctly!'
    });
    
    return Response.json({ success: true, message: `Test email sent to ${email}` });
  } catch (error) {
    console.error('Error sending test email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});