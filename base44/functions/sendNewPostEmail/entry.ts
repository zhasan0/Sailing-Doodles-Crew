import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const payload = await req.json();
    const post = payload.data;
    
    // Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      type: 'new_post',
      title: `New post: ${post.title}`,
      message: post.body ? post.body.substring(0, 200) + '...' : 'Check it out on the feed!',
      link: `Feed?postId=${post.id}`,
      for_all: true,
    });
    
    // Get all users - treat missing preference as opted-in (true by default)
    const users = await base44.asServiceRole.entities.User.list();
    
    // Send email to each user (except the author)
    for (const user of users) {
      if (user.email && user.notify_new_posts !== false) {
        const appUrl = `https://crew.sailingdoodles.com/Feed?postId=${post.id}`;
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `New post: ${post.title}`,
          body: `Hey ${user.display_name}!\n\nThere's a new post from the community:\n\n${post.title}\n\n${post.body ? post.body.substring(0, 200) + '...' : 'Check it out on the feed!'}\n\nRead more: ${appUrl}`
        });
      }
    }
    
    return Response.json({ sent: users.length });
  } catch (error) {
    console.error('Error sending post emails:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});