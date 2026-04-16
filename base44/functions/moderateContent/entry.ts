import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const { item_type, item_id, report_id } = await req.json();

    console.log(`[moderateContent] admin=${user.email} item_type=${item_type} item_id=${item_id} report_id=${report_id}`);

    // Service role bypasses all RLS — can delete any user's content
    const sr = base44.asServiceRole;

    let deleted = false;

    if (item_id && !item_id.startsWith('user:')) {
      if (item_type === 'post') {
        // Try feed Post first, then ForumThread
        try {
          await sr.entities.Post.delete(item_id);
          console.log(`[moderateContent] Deleted Post ${item_id}`);
          deleted = true;
        } catch (e1) {
          console.log(`[moderateContent] Post.delete failed: ${e1.message}, trying ForumThread...`);
          try {
            await sr.entities.ForumThread.delete(item_id);
            console.log(`[moderateContent] Deleted ForumThread ${item_id}`);
            deleted = true;
          } catch (e2) {
            console.error(`[moderateContent] ForumThread.delete also failed: ${e2.message}`);
            return Response.json({ error: `Could not delete post/thread: ${e2.message}` }, { status: 422 });
          }
        }
      } else if (item_type === 'comment') {
        // Try feed Comment first, then ForumReply
        try {
          await sr.entities.Comment.delete(item_id);
          console.log(`[moderateContent] Deleted Comment ${item_id}`);
          deleted = true;
        } catch (e1) {
          console.log(`[moderateContent] Comment.delete failed: ${e1.message}, trying ForumReply...`);
          try {
            await sr.entities.ForumReply.delete(item_id);
            console.log(`[moderateContent] Deleted ForumReply ${item_id}`);
            deleted = true;
          } catch (e2) {
            console.error(`[moderateContent] ForumReply.delete also failed: ${e2.message}`);
            return Response.json({ error: `Could not delete comment/reply: ${e2.message}` }, { status: 422 });
          }
        }
      } else if (item_type === 'message') {
        // Try ChatMessage first, then DirectMessage
        try {
          await sr.entities.ChatMessage.delete(item_id);
          console.log(`[moderateContent] Deleted ChatMessage ${item_id}`);
          deleted = true;
        } catch (e1) {
          console.log(`[moderateContent] ChatMessage.delete failed: ${e1.message}, trying DirectMessage...`);
          try {
            await sr.entities.DirectMessage.delete(item_id);
            console.log(`[moderateContent] Deleted DirectMessage ${item_id}`);
            deleted = true;
          } catch (e2) {
            console.error(`[moderateContent] DirectMessage.delete also failed: ${e2.message}`);
            return Response.json({ error: `Could not delete message: ${e2.message}` }, { status: 422 });
          }
        }
      } else {
        console.log(`[moderateContent] Unknown item_type: ${item_type}`);
      }
    } else {
      console.log(`[moderateContent] No content to delete (user profile report or missing id)`);
      deleted = true; // nothing to delete, just update report
    }

    // Mark report as removed
    if (report_id) {
      await sr.entities.ContentReport.update(report_id, { status: 'removed' });
      console.log(`[moderateContent] Report ${report_id} marked as removed`);
    }

    return Response.json({ success: true, deleted, item_type, item_id });
  } catch (error) {
    console.error('[moderateContent] Unexpected error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});