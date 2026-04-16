import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const payload = await req.json();
    const reply = payload.data;
    const threadId = reply.thread_id;
    
    // Get the thread to find the original author
    const threads = await base44.asServiceRole.entities.ForumThread.filter({ id: threadId });
    if (threads.length === 0) {
      return Response.json({ error: 'Thread not found' }, { status: 404 });
    }
    const thread = threads[0];
    
    // Get users who follow this thread
    const followers = await base44.asServiceRole.entities.ForumFollow.filter({ thread_id: threadId });
    const followerEmails = new Set(followers.map(f => f.user_email));
    
    // Get all users - treat missing preference as opted-in (true by default)
    const users = await base44.asServiceRole.entities.User.list();
    
    // Send emails to: followers who opted in, and thread author who opted in
    const emailsToSend = new Set();
    
    for (const user of users) {
      if (user.email && user.notify_forum !== false) {
        // Send to followers
        if (followerEmails.has(user.email)) {
          emailsToSend.add(user.email);
        }
        // Send to original thread author
        if (user.email === thread.author_email) {
          emailsToSend.add(user.email);
        }
      }
    }
    
    // Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      type: 'new_post',
      title: `New reply: ${thread.title}`,
      message: reply.body.substring(0, 200) + '...',
      link: `/Thread?id=${threadId}`,
      for_all: false,
      for_user: thread.author_email,
    });
    
    // Send emails
    for (const email of emailsToSend) {
      const user = users.find(u => u.email === email);
      const appUrl = `https://crew.sailingdoodles.com/Thread?id=${threadId}`;
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `New reply: ${thread.title}`,
        body: `Hey ${user?.display_name}!\n\nThere's a new reply to "${thread.title}":\n\n${reply.body.substring(0, 200)}...\n\nRead more: ${appUrl}`
      });
    }
    
    return Response.json({ sent: emailsToSend.size });
  } catch (error) {
    console.error('Error sending forum emails:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});