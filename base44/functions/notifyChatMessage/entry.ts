import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { channel_id, message_text, sender_name, sender_id } = await req.json();

    if (!channel_id || !sender_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get channel and members
    const channel = await base44.asServiceRole.entities.ChatChannel.get(channel_id);
    if (!channel) {
      return Response.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Send notifications to members who haven't read it
    const notificationPromises = (channel.member_ids || [])
      .filter(id => id !== sender_id)
      .map(memberId =>
        base44.asServiceRole.functions.invoke('sendNotification', {
          user_id: memberId,
          title: `New message in ${channel.name}`,
          body: `${sender_name}: ${message_text.substring(0, 50)}${message_text.length > 50 ? '...' : ''}`,
          action_url: `/Chat?channel=${channel_id}`,
          action_label: 'Open Chat'
        }).catch(err => console.error(`Failed to notify ${memberId}:`, err))
      );

    await Promise.all(notificationPromises);

    return Response.json({ success: true, notified: channel.member_ids.length - 1 });
  } catch (error) {
    console.error('Notify chat message error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});