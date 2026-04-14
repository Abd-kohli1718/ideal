const { getServiceClient } = require('../services/supabase');

async function updateLocation(req, res) {
  const { latitude, longitude } = req.body || {};
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: 'latitude and longitude are required' });
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('users')
      .update({
        latitude: Number(latitude),
        longitude: Number(longitude),
      })
      .eq('id', req.user.id)
      .select('id, email, full_name, role, latitude, longitude')
      .single();

    if (error || !data) {
      console.error('updateLocation', error);
      return res.status(500).json({ success: false, error: 'Failed to update location' });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error('updateLocation', e);
    return res.status(500).json({ success: false, error: 'Failed to update location' });
  }
}

async function listResponders(req, res) {
  try {
    const supabase = getServiceClient();
    const { data: responders, error } = await supabase
      .from('users')
      .select('id, email, full_name, latitude, longitude, created_at')
      .eq('role', 'responder');

    if (error) {
      console.error('listResponders', error);
      return res.status(500).json({ success: false, error: 'Failed to load responders' });
    }

    const ids = (responders || []).map((r) => r.id);
    let openByResponder = {};

    if (ids.length > 0) {
      const { data: assignments, error: aErr } = await supabase
        .from('responder_assignments')
        .select('responder_id, resolved_at')
        .in('responder_id', ids);

      if (!aErr && assignments) {
        openByResponder = assignments.reduce((acc, row) => {
          if (row.resolved_at == null) {
            acc[row.responder_id] = true;
          }
          return acc;
        }, {});
      }
    }

    const rows = (responders || []).map((r) => ({
      ...r,
      status: openByResponder[r.id] ? 'busy' : 'available',
    }));

    return res.json({ success: true, data: { responders: rows } });
  } catch (e) {
    console.error('listResponders', e);
    return res.status(500).json({ success: false, error: 'Failed to load responders' });
  }
}

module.exports = { updateLocation, listResponders };
