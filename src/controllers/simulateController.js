const { getServiceClient, broadcastAlert } = require('../services/supabase');
const { runTriage } = require('../services/triageService');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

// ═══════════════════════════════════════════════════════════════════
// FAKE USERS — simulated posts come from these, NOT the logged-in user
// ═══════════════════════════════════════════════════════════════════
const FAKE_USERS = [
  { name: 'Arun Sharma', email: 'arun.sharma@resq.sim' },
  { name: 'Priya Patel', email: 'priya.patel@resq.sim' },
  { name: 'Rahul Menon', email: 'rahul.menon@resq.sim' },
  { name: 'Sneha Reddy', email: 'sneha.reddy@resq.sim' },
  { name: 'Vikram Singh', email: 'vikram.singh@resq.sim' },
  { name: 'Anjali Nair', email: 'anjali.nair@resq.sim' },
  { name: 'Karthik Iyer', email: 'karthik.iyer@resq.sim' },
  { name: 'Meera Das', email: 'meera.das@resq.sim' },
  { name: 'Rohan Kulkarni', email: 'rohan.kulkarni@resq.sim' },
  { name: 'Divya Joshi', email: 'divya.joshi@resq.sim' },
];

// ═══════════════════════════════════════════════════════════════════
// PROGRESS STATES — simulated posts show realistic response progress
// ═══════════════════════════════════════════════════════════════════
const PROGRESS_STATES = [
  { status: 'active', progress: 15, label: 'Alert received — assessing situation' },
  { status: 'active', progress: 30, label: 'Team dispatched — ETA 8 mins' },
  { status: 'active', progress: 45, label: 'First responders on scene' },
  { status: 'active', progress: 60, label: 'Rescue operation in progress' },
  { status: 'active', progress: 75, label: 'Situation under control — clearing area' },
  { status: 'active', progress: 85, label: 'Medical teams treating injured' },
  { status: 'resolved', progress: 100, label: 'Incident resolved — area secured' },
];

// ═══════════════════════════════════════════════════════════════════
// 20 REAL DISASTER INCIDENTS with local media fallback
// ═══════════════════════════════════════════════════════════════════
const DISASTER_INCIDENTS = [
  {
    caption: 'WILDFIRE ALERT: Massive wildfire engulfing hillside forest. Flames visible across 3km stretch. Residential colony at risk. All fire stations deployed.',
    severity: 'high', response: 'fire',
  },
  {
    caption: 'STRUCTURE FIRE: Multi-story commercial building ablaze on MG Road. Heavy smoke, upper 3 floors fully involved. 12 fire tenders responding.',
    severity: 'high', response: 'fire',
  },
  {
    caption: 'SEVERE FLOODING: Streets completely submerged after 72hrs continuous rainfall. Water level 4ft on main roads. Army rescue boats deployed.',
    severity: 'high', response: 'rescue',
  },
  {
    caption: 'FLOOD EMERGENCY: River breached embankment near Ulsoor. Low-lying areas inundated. 500+ families displaced. Relief camps activated.',
    severity: 'high', response: 'rescue',
  },
  {
    caption: 'SEVERE STORM: Category-3 thunderstorm approaching. Lightning strikes reported every 2 minutes. 15 trees uprooted. Power outage across 6 wards.',
    severity: 'medium', response: 'rescue',
  },
  {
    caption: 'CYCLONE DAMAGE: Coastal structures severely damaged by cyclonic winds at 120kmph. Roofs ripped off 50+ homes. Emergency shelters at full capacity.',
    severity: 'high', response: 'rescue',
  },
  {
    caption: 'EARTHQUAKE: 5.8 magnitude earthquake — partial building collapse. Rubble blocking roads. Search & rescue teams with K9 units dispatched.',
    severity: 'high', response: 'rescue',
  },
  {
    caption: 'BUILDING DAMAGE: Apartment complex showing dangerous structural cracks after seismic tremors. 180 residents relocated to temporary shelters.',
    severity: 'high', response: 'rescue',
  },
  {
    caption: 'CONSTRUCTION COLLAPSE: Crane collapse at metro construction site. 6 workers trapped under debris. Heavy machinery deployed. Ambulances on standby.',
    severity: 'high', response: 'ambulance',
  },
  {
    caption: 'HIGHWAY ACCIDENT: Multi-vehicle pileup on expressway. Dense fog, 8 vehicles involved. 5 critical injuries. Air ambulance requested.',
    severity: 'high', response: 'ambulance',
  },
  {
    caption: 'MEDICAL EMERGENCY: Industrial chemical exposure at factory. 23 workers showing respiratory distress. 4 ambulances dispatched. Hazmat team assessing.',
    severity: 'medium', response: 'ambulance',
  },
  {
    caption: 'DISASTER RELIEF: Field hospital operational. 150+ patients treated in 24hrs. Blood bank supplies low. Volunteer doctors needed urgently.',
    severity: 'medium', response: 'ambulance',
  },
  {
    caption: 'RESIDENTIAL FIRE: House fire — kitchen gas cylinder exploded. Family of 4 rescued from rooftop. 2 fire engines on scene. Adjacent buildings evacuated.',
    severity: 'high', response: 'fire',
  },
  {
    caption: 'STORM AFTERMATH: Trees blocking arterial roads across 4 zones. Power lines down. 45,000 homes without electricity. Crews working through night.',
    severity: 'medium', response: 'rescue',
  },
  {
    caption: 'TOXIC SMOKE: Dense smoke from warehouse fire. AQI exceeding 500. Schools within 5km closed. Residents advised to wear N95 masks.',
    severity: 'medium', response: 'fire',
  },
  {
    caption: 'HAZMAT INCIDENT: Chemical spill at paint factory. Unknown substances leaking into storm drain. 800m exclusion zone. Environmental team deployed.',
    severity: 'high', response: 'rescue',
  },
  {
    caption: 'URBAN FLOODING: Underpass completely waterlogged. 15 vehicles submerged. Rescue divers searching for occupants. Traffic redirected.',
    severity: 'high', response: 'rescue',
  },
  {
    caption: 'FOREST FIRE: National Park boundary fire spreading rapidly due to dry winds at 40kmph. Wildlife evacuation initiated. 8 fire stations mobilized.',
    severity: 'high', response: 'fire',
  },
  {
    caption: 'FLASH FLOODS: Sudden flooding after cloud burst. Water rising at 1ft/hour. NDRF team deployed with inflatable boats. 80+ people rescued.',
    severity: 'high', response: 'rescue',
  },
  {
    caption: 'RESCUE OPERATION: High-rise rescue in progress. Ladder truck deployed to 8th floor. 12 residents with smoke inhalation being treated on site.',
    severity: 'medium', response: 'fire',
  },
];

let incidentIndex = 0;

function randomNearBangalore() {
  return {
    latitude: BANGALORE_CENTER.lat + (Math.random() - 0.5) * 0.12,
    longitude: BANGALORE_CENTER.lng + (Math.random() - 0.5) * 0.12,
  };
}

/**
 * Scan the simulation media folders for user-provided files.
 * Falls back gracefully if no files found.
 */
function getSimulationMedia() {
  const mediaDir = path.join(__dirname, '../../frontend/public/simulation');
  const result = { images: [], videos: [], audio: [] };

  try {
    const imgDir = path.join(mediaDir, 'images');
    if (fs.existsSync(imgDir)) {
      result.images = fs.readdirSync(imgDir)
        .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
        .map(f => `/simulation/images/${f}`);
    }
    const vidDir = path.join(mediaDir, 'videos');
    if (fs.existsSync(vidDir)) {
      result.videos = fs.readdirSync(vidDir)
        .filter(f => /\.(mp4|webm|mov)$/i.test(f))
        .map(f => `/simulation/videos/${f}`);
    }
    const audDir = path.join(mediaDir, 'audio');
    if (fs.existsSync(audDir)) {
      result.audio = fs.readdirSync(audDir)
        .filter(f => /\.(mp3|wav|ogg|webm|m4a)$/i.test(f))
        .map(f => `/simulation/audio/${f}`);
    }
  } catch (err) {
    console.error('getSimulationMedia:', err.message);
  }

  return result;
}

/**
 * Get or create a fake simulation user (NOT the logged-in user)
 */
async function getOrCreateFakeUser(supabase) {
  const fakeUser = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
  // Deterministic UUID from email
  const id = crypto.createHash('md5').update(fakeUser.email).digest('hex');
  const uuid = `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20,32)}`;

  await supabase.from('users').upsert({
    id: uuid,
    email: fakeUser.email,
    full_name: fakeUser.name,
    role: 'citizen',
  }, { onConflict: 'id' });

  return { id: uuid, name: fakeUser.name, email: fakeUser.email };
}

async function ensureUserExists(supabase, user) {
  const { data } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();
  if (!data) {
    await supabase.from('users').upsert({
      id: user.id,
      email: user.email || `sim-${user.id}@resq.app`,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      role: user.user_metadata?.role || 'citizen',
    }, { onConflict: 'id' });
  }
}

async function createAndTriage(req, { type, message, severity, response_type, useFakeUser }) {
  const supabase = getServiceClient();
  const coords = randomNearBangalore();

  let userId;
  if (useFakeUser) {
    const fakeUser = await getOrCreateFakeUser(supabase);
    userId = fakeUser.id;
  } else {
    await ensureUserExists(supabase, req.user);
    userId = req.user.id;
  }

  // Pick a random progress state for simulated posts
  const progressState = PROGRESS_STATES[Math.floor(Math.random() * PROGRESS_STATES.length)];

  const { data: inserted, error: insErr } = await supabase
    .from('alerts')
    .insert({
      user_id: userId, type, message,
      latitude: coords.latitude, longitude: coords.longitude,
      severity: severity || 'low',
      response_type: response_type || 'unknown',
      status: progressState.status,
    })
    .select().single();

  if (insErr || !inserted) {
    console.error('simulate insert', insErr);
    throw new Error(insErr?.message || 'Failed to create simulated alert');
  }

  await runTriage(inserted.id, inserted.message, inserted.type, inserted.latitude, inserted.longitude);

  const { data: updated } = await supabase
    .from('alerts').select('*, triage_results(*)').eq('id', inserted.id).single();

  const row = updated || inserted;
  let triage_result = null;
  if (Array.isArray(row.triage_results) && row.triage_results.length > 0) {
    triage_result = [...row.triage_results].sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )[0];
  }

  const payload = {
    ...row,
    triage_result,
    simulation_progress: progressState,
  };
  try { await broadcastAlert(supabase, { alert: payload }); } catch (e) { console.error('broadcast', e); }
  return payload;
}

async function simulateSocial(req, res) {
  try {
    const incident = DISASTER_INCIDENTS[incidentIndex % DISASTER_INCIDENTS.length];
    incidentIndex++;

    // Pick media from local files if available
    const media = getSimulationMedia();
    let mediaTag = '';

    // Rotate through available media types
    const mediaPool = [];
    if (media.images.length > 0) mediaPool.push(...media.images.map(p => ({ url: p, type: 'image' })));
    if (media.videos.length > 0) mediaPool.push(...media.videos.map(p => ({ url: p, type: 'video' })));
    if (media.audio.length > 0) mediaPool.push(...media.audio.map(p => ({ url: p, type: 'audio' })));

    if (mediaPool.length > 0) {
      const pick = mediaPool[incidentIndex % mediaPool.length];
      mediaTag = `[MEDIA:${pick.url}] `;
    }

    const message = `${mediaTag}${incident.caption}`;
    const data = await createAndTriage(req, {
      type: 'social_post',
      message,
      severity: incident.severity,
      response_type: incident.response,
      useFakeUser: true, // ← NOT the logged-in user
    });

    return res.status(201).json({
      success: true,
      data: { ...data, simulation_meta: { source: 'curated_disaster', incidentId: incidentIndex } },
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
      useFakeUser: true,
    });
    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error('simulateSos', e);
    return res.status(500).json({ success: false, error: e.message || 'Simulation failed' });
  }
}

module.exports = { simulateSocial, simulateSos };
