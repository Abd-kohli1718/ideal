const { getServiceClient, broadcastAlert } = require('../services/supabase');
const { runTriage } = require('../services/triageService');

function mapAlertRow(row) {
  if (!row) return row;
  const triageList = row.triage_results;
  if (Array.isArray(triageList) && triageList.length > 0) {
    const sorted = [...triageList].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
    const { triage_results, ...rest } = row;
    return { ...rest, triage_results: sorted, triage_result: sorted[0] };
  }
  const { triage_results, ...rest } = row;
  return { ...rest, triage_result: null };
}

async function createAlert(req, res) {
  const { type, message, latitude, longitude } = req.body || {};
  if (!message || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      success: false,
      error: 'message, latitude, and longitude are required',
    });
  }

  const alertType = ['sos_button', 'social_post', 'manual_form', 'audio_sos', 'media_post'].includes(type)
    ? type
    : 'manual_form';

  try {
    const supabase = getServiceClient();
    const { data: inserted, error: insErr } = await supabase
      .from('alerts')
      .insert({
        user_id: req.user.id,
        type: alertType,
        message,
        latitude: Number(latitude),
        longitude: Number(longitude),
        severity: 'low',
        response_type: 'unknown',
        status: 'active',
      })
      .select()
      .single();

    if (insErr || !inserted) {
      console.error('createAlert insert', insErr);
      return res.status(500).json({ success: false, error: insErr?.message || 'Failed to create alert' });
    }

    await runTriage(inserted.id, inserted.message, inserted.type, inserted.latitude, inserted.longitude);

    const { data: updated, error: fetchErr } = await supabase
      .from('alerts')
      .select('*, triage_results(*)')
      .eq('id', inserted.id)
      .single();

    if (fetchErr) {
      console.error('createAlert refetch', fetchErr);
    }

    const payload = mapAlertRow(updated || inserted);

    try {
      await broadcastAlert(supabase, { alert: payload });
    } catch (bErr) {
      console.error('createAlert broadcast', bErr);
    }

    return res.status(201).json({ success: true, data: payload });
  } catch (e) {
    console.error('createAlert', e);
    return res.status(500).json({ success: false, error: e.message || 'Failed to create alert' });
  }
}

async function listAlerts(req, res) {
  const { status, severity, type } = req.query;

  try {
    const supabase = getServiceClient();
    let q = supabase
      .from('alerts')
      .select('*, triage_results(*)')
      .order('created_at', { ascending: false });

    if (status) q = q.eq('status', status);
    if (severity) q = q.eq('severity', severity);
    if (type) q = q.eq('type', type);

    const { data, error } = await q;

    if (error) {
      console.error('listAlerts', error);
      return res.status(500).json({ success: false, error: 'Failed to load alerts' });
    }

    const rows = (data || []).map(mapAlertRow);
    return res.json({ success: true, data: { alerts: rows } });
  } catch (e) {
    console.error('listAlerts', e);
    return res.status(500).json({ success: false, error: 'Failed to load alerts' });
  }
}

async function getAlert(req, res) {
  const { id } = req.params;
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('alerts')
      .select('*, triage_results(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    return res.json({ success: true, data: mapAlertRow(data) });
  } catch (e) {
    console.error('getAlert', e);
    return res.status(500).json({ success: false, error: 'Failed to load alert' });
  }
}

async function acceptAlert(req, res) {
  const { id } = req.params;
  try {
    const supabase = getServiceClient();
    const { data: alert, error: aErr } = await supabase
      .from('alerts')
      .select('id, status')
      .eq('id', id)
      .single();

    if (aErr || !alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    if (alert.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Alert is not active' });
    }

    const { error: uErr } = await supabase
      .from('alerts')
      .update({ status: 'accepted' })
      .eq('id', id);

    if (uErr) {
      console.error('acceptAlert update', uErr);
      return res.status(500).json({ success: false, error: 'Failed to accept alert' });
    }

    const { error: asErr } = await supabase.from('responder_assignments').insert({
      alert_id: id,
      responder_id: req.user.id,
      accepted_at: new Date().toISOString(),
    });

    if (asErr) {
      console.error('acceptAlert assignment', asErr);
      return res.status(500).json({ success: false, error: 'Failed to record assignment' });
    }

    const { data: full, error: fErr } = await supabase
      .from('alerts')
      .select('*, triage_results(*)')
      .eq('id', id)
      .single();

    if (fErr) {
      return res.json({ success: true, data: { id, status: 'accepted' } });
    }

    return res.json({ success: true, data: mapAlertRow(full) });
  } catch (e) {
    console.error('acceptAlert', e);
    return res.status(500).json({ success: false, error: 'Failed to accept alert' });
  }
}

async function resolveAlert(req, res) {
  const { id } = req.params;
  const now = new Date().toISOString();

  try {
    const supabase = getServiceClient();
    const { data: alert, error: aErr } = await supabase
      .from('alerts')
      .select('id, status')
      .eq('id', id)
      .single();

    if (aErr || !alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    if (alert.status === 'resolved') {
      return res.status(400).json({ success: false, error: 'Alert already resolved' });
    }

    const { error: uErr } = await supabase
      .from('alerts')
      .update({ status: 'resolved' })
      .eq('id', id);

    if (uErr) {
      console.error('resolveAlert update', uErr);
      return res.status(500).json({ success: false, error: 'Failed to resolve alert' });
    }

    const { error: asErr } = await supabase
      .from('responder_assignments')
      .update({ resolved_at: now })
      .eq('alert_id', id)
      .eq('responder_id', req.user.id);

    if (asErr) {
      console.error('resolveAlert assignment', asErr);
    }

    const { data: full, error: fErr } = await supabase
      .from('alerts')
      .select('*, triage_results(*)')
      .eq('id', id)
      .single();

    if (fErr) {
      return res.json({ success: true, data: { id, status: 'resolved' } });
    }

    return res.json({ success: true, data: mapAlertRow(full) });
  } catch (e) {
    console.error('resolveAlert', e);
    return res.status(500).json({ success: false, error: 'Failed to resolve alert' });
  }
}

module.exports = {
  createAlert,
  listAlerts,
  getAlert,
  acceptAlert,
  resolveAlert,
};
