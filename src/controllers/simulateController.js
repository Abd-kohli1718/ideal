const { getServiceClient, broadcastAlert } = require('../services/supabase');
const { runTriage } = require('../services/triageService');

const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

// Text-only emergency reports
const TEXT_REPORTS = [
  { message: 'Major accident on Outer Ring Road near Silk Board — multiple vehicles, people trapped, need ambulance urgently.', severity: 'high' },
  { message: 'Fire broke out in a commercial building on MG Road, thick smoke visible from Brigade Road side.', severity: 'high' },
  { message: 'Someone collapsed at the metro station platform, not breathing properly, please send medical help.', severity: 'medium' },
  { message: 'Large crowd disturbance near college gate, possible fight, police needed immediately.', severity: 'medium' },
  { message: 'Gas smell very strong in the apartment basement, worried about leak, need fire department.', severity: 'medium' },
  { message: 'Tree fallen on road blocking traffic near Ulsoor, injured pedestrians reported.', severity: 'low' },
  { message: 'Flooding on the underpass after heavy rain, car stuck with people inside, rescue team needed.', severity: 'high' },
  { message: 'Power lines sparking on the street after storm, risk of fire, stay clear and send emergency crew.', severity: 'medium' },
  { message: 'Building tilting dangerously after heavy rains in Majestic area. Residents evacuated. Structural engineers needed.', severity: 'high' },
  { message: 'Chemical spill at factory in Peenya Industrial Area. Strong fumes spreading. Hazmat team required immediately.', severity: 'high' },
  { message: 'Elderly person found unconscious on footpath near Cubbon Park. No ID found. Need ambulance and police.', severity: 'medium' },
  { message: 'Landslide blocking Mysore Road after continuous rainfall. Several vehicles stranded. NDRF team requested.', severity: 'high' },
  { message: 'Drunk driver crashed into roadside stalls near Shivajinagar. 2 bystanders injured. Police and ambulance requested.', severity: 'medium' },
  { message: 'Heavy flooding in Bellandur area. Water entering ground floor apartments. Residents stranded on upper floors. Rescue boats needed.', severity: 'high' },
  { message: 'Suspicious package found near Majestic bus stand. Area being cordoned off. Bomb squad requested.', severity: 'high' },
  { message: 'Minor road accident near Huda City Centre. Two vehicles involved, no major injuries reported. Traffic diverted.', severity: 'low' },
  { message: 'Child missing near park playground for 30 minutes, need police assistance to coordinate search.', severity: 'medium' },
  { message: 'Road cave-in on Hosur Main Road after water pipeline burst. Traffic completely blocked. Municipal workers dispatched.', severity: 'low' },
];

// Image reports using REAL disaster images from CrisisMMD dataset (uploaded to Supabase Storage)
const IMAGE_REPORTS = [
  {
    message: '[MEDIA:https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/wildfire_1776992268473_qilh.jpg] Wildfire spreading rapidly near residential areas. Thick smoke covering the sky. Evacuation orders issued for nearby neighborhoods. Fire department deploying all available units.',
    severity: 'high',
  },
  {
    message: '[MEDIA:https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/wildfire_1776992268944_8fw2.jpg] Massive wildfire damage reported in the outskirts. Several structures destroyed. Firefighters struggling to contain the blaze due to strong winds. Additional resources requested.',
    severity: 'high',
  },
  {
    message: '[MEDIA:https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_1776992269406_ekc0.jpg] Severe storm damage across multiple neighborhoods. Rooftops torn off, trees uprooted, power lines down. Emergency shelters being set up. Rescue teams deployed.',
    severity: 'high',
  },
  {
    message: '[MEDIA:https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_1776992269793_snol.jpg] Hurricane aftermath — widespread destruction visible. Multiple buildings damaged, debris scattered across roads. Emergency services coordinating relief operations.',
    severity: 'high',
  },
  {
    message: '[MEDIA:https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/flood_1776992270121_ygqp.jpg] Severe flooding reported after continuous heavy rainfall. Streets submerged, vehicles stranded. Residents evacuating to higher ground. Army rescue teams called in.',
    severity: 'high',
  },
  {
    message: '[MEDIA:https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/earthquake_1776992270622_y4i5.jpg] Earthquake damage — partial building collapse in the commercial district. Rubble on streets. Search and rescue operations underway for trapped individuals.',
    severity: 'high',
  },
  {
    message: '[MEDIA:https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/earthquake_1776992270925_xxl4.jpg] Earthquake aftermath: structural damage to multiple buildings. Cracks visible on walls. Residents evacuated as safety inspections begin. Medical teams on standby.',
    severity: 'medium',
  },
  {
    message: '[MEDIA:https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_1776992271244_gfiy.jpg] Major storm devastation in coastal area. Infrastructure severely damaged. Communication lines down. Emergency relief operations in progress.',
    severity: 'high',
  },
];

function randomNearBangalore() {
  const dLat = (Math.random() - 0.5) * 0.12;
  const dLng = (Math.random() - 0.5) * 0.12;
  return {
    latitude: BANGALORE_CENTER.lat + dLat,
    longitude: BANGALORE_CENTER.lng + dLng,
  };
}

/**
 * Ensure the authenticated user exists in public.users table
 * to satisfy the alerts.user_id foreign key constraint.
 */
async function ensureUserExists(supabase, user) {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!data) {
    const email = user.email || `unknown-${user.id}@domain.com`;
    const full_name = user.user_metadata?.full_name || user.user_metadata?.name || null;
    const role = user.user_metadata?.role || 'citizen';

    const { error: insertErr } = await supabase.from('users').upsert({
      id: user.id,
      email,
      full_name,
      role,
    }, { onConflict: 'id' });

    if (insertErr) {
      console.error('ensureUserExists: insert failed', insertErr);
    }
  }
}

async function createAndTriage(req, { type, message, severity }) {
  const supabase = getServiceClient();
  const coords = randomNearBangalore();

  await ensureUserExists(supabase, req.user);

  const { data: inserted, error: insErr } = await supabase
    .from('alerts')
    .insert({
      user_id: req.user.id,
      type,
      message,
      latitude: coords.latitude,
      longitude: coords.longitude,
      severity: severity || 'low',
      response_type: 'unknown',
      status: 'active',
    })
    .select()
    .single();

  if (insErr || !inserted) {
    console.error('simulate insert', insErr);
    throw new Error(insErr?.message || 'Failed to create simulated alert');
  }

  await runTriage(inserted.id, inserted.message, inserted.type, inserted.latitude, inserted.longitude);

  const { data: updated, error: fetchErr } = await supabase
    .from('alerts')
    .select('*, triage_results(*)')
    .eq('id', inserted.id)
    .single();

  if (fetchErr) {
    console.error('simulate refetch', fetchErr);
  }

  const row = updated || inserted;
  const triageList = row.triage_results;
  let triage_result = null;
  if (Array.isArray(triageList) && triageList.length > 0) {
    triage_result = [...triageList].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )[0];
  }

  const payload = { ...row, triage_result };
  try {
    await broadcastAlert(supabase, { alert: payload });
  } catch (bErr) {
    console.error('simulate broadcast', bErr);
  }

  return payload;
}

async function simulateSocial(req, res) {
  try {
    let message;
    let severity;
    let simulationMeta = { source: 'demo' };

    // 50% chance image report, 50% text-only — all using REAL disaster data
    if (Math.random() < 0.5) {
      const imgReport = IMAGE_REPORTS[Math.floor(Math.random() * IMAGE_REPORTS.length)];
      message = imgReport.message;
      severity = imgReport.severity;
      simulationMeta = { source: 'crisisMMD', type: 'image_report' };
    } else {
      const textReport = TEXT_REPORTS[Math.floor(Math.random() * TEXT_REPORTS.length)];
      message = textReport.message;
      severity = textReport.severity;
      simulationMeta = { source: 'demo', type: 'text_report' };
    }

    const data = await createAndTriage(req, { type: 'social_post', message, severity });
    return res.status(201).json({
      success: true,
      data: { ...data, simulation_meta: simulationMeta },
    });
  } catch (e) {
    console.error('simulateSocial', e);
    return res.status(500).json({ success: false, error: e.message || 'Simulation failed' });
  }
}

async function simulateSos(req, res) {
  try {
    const data = await createAndTriage(req, {
      type: 'sos_button',
      message: 'SOS triggered',
    });
    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error('simulateSos', e);
    return res.status(500).json({ success: false, error: e.message || 'Simulation failed' });
  }
}

module.exports = { simulateSocial, simulateSos };
