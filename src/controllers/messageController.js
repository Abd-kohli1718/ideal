const { getServiceClient } = require('../services/supabase');

/**
 * List all messages for a given alert.
 * Both the alert owner (citizen) and any responder/admin can view.
 */
async function listMessages(req, res) {
  const { alertId } = req.params;
  try {
    const supabase = getServiceClient();

    // Verify alert exists
    const { data: alert, error: aErr } = await supabase
      .from('alerts')
      .select('id, user_id')
      .eq('id', alertId)
      .maybeSingle();

    if (aErr || !alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    // Fetch messages ordered oldest-first (chat order)
    const { data: messages, error: mErr } = await supabase
      .from('messages')
      .select('*')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: true });

    if (mErr) {
      console.error('listMessages', mErr);
      return res.status(500).json({ success: false, error: 'Failed to load messages' });
    }

    return res.json({ success: true, data: { messages: messages || [] } });
  } catch (e) {
    console.error('listMessages', e);
    return res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
}

/**
 * Send a message on an alert thread.
 * Citizens can message on their own alerts.
 * Responders/admins can message on any alert.
 */
async function createMessage(req, res) {
  const { alertId } = req.params;
  const { content } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, error: 'Message content is required' });
  }

  try {
    const supabase = getServiceClient();

    // Verify alert exists
    const { data: alert, error: aErr } = await supabase
      .from('alerts')
      .select('id, user_id')
      .eq('id', alertId)
      .maybeSingle();

    if (aErr || !alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    // Determine sender role from users table or metadata
    let senderRole = req.user.user_metadata?.role || 'citizen';
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('id', req.user.id)
        .maybeSingle();
      if (userRow?.role) senderRole = userRow.role;
    } catch {}

    // Get sender display name
    const senderName =
      req.user.user_metadata?.full_name ||
      req.user.user_metadata?.name ||
      req.user.email?.split('@')[0] ||
      'User';

    // Authorization: citizen can only chat on their own alert
    if (senderRole === 'citizen' && alert.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You can only chat on your own alerts' });
    }

    const { data: message, error: insErr } = await supabase
      .from('messages')
      .insert({
        alert_id: alertId,
        sender_id: req.user.id,
        sender_role: senderRole,
        sender_name: senderName,
        content: content.trim(),
      })
      .select()
      .single();

    if (insErr || !message) {
      console.error('createMessage insert', insErr);
      return res.status(500).json({ success: false, error: insErr?.message || 'Failed to send message' });
    }

    return res.status(201).json({ success: true, data: message });
  } catch (e) {
    console.error('createMessage', e);
    return res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}

module.exports = { listMessages, createMessage };
