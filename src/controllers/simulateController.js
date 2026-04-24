const { getServiceClient, broadcastAlert } = require('../services/supabase');
const { runTriage } = require('../services/triageService');

const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

// ═══════════════════════════════════════════════════════════════
// 20 VERIFIED DISASTER IMAGES — Unsplash (free, reliable, real)
// Each URL is a confirmed disaster/emergency photo
// ═══════════════════════════════════════════════════════════════
const IMAGE_REPORTS = [
  // FIRES
  {
    url: 'https://images.unsplash.com/photo-1486551937199-baf066858de7?w=600&q=80',
    caption: 'Massive wildfire spreading across forested hillside. Thick smoke covering the sky. Evacuation orders issued for nearby residential areas. All fire units deployed.',
    severity: 'high',
  },
  {
    url: 'https://images.unsplash.com/photo-1602980175-0569a7daee56?w=600&q=80',
    caption: 'Building engulfed in flames. Fire crews on scene battling the blaze. Multiple floors affected. Residents evacuated safely. Structural collapse risk high.',
    severity: 'high',
  },
  {
    url: 'https://images.unsplash.com/photo-1473260079959-28e8bee5d782?w=600&q=80',
    caption: 'Forest fire burning through dry brush and trees. Smoke plume visible for kilometers. Firefighters establishing containment lines. Wind shifts making control difficult.',
    severity: 'high',
  },
  {
    url: 'https://images.unsplash.com/photo-1599228700045-55e253e3e9bd?w=600&q=80',
    caption: 'House fire reported in residential neighborhood. Two fire engines responding. Thick black smoke pouring from upper floors. Neighbors being evacuated as precaution.',
    severity: 'high',
  },
  // FLOODS
  {
    url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&q=80',
    caption: 'Severe urban flooding — streets completely submerged after 48 hours of continuous rainfall. Vehicles stranded. Rescue boats deployed for stranded residents.',
    severity: 'high',
  },
  {
    url: 'https://images.unsplash.com/photo-1613169803738-244fa2a4cae5?w=600&q=80',
    caption: 'Flood waters rising rapidly in low-lying residential area. Ground floors inundated. Army rescue teams evacuating families. Relief camps set up on higher ground.',
    severity: 'high',
  },
  {
    url: 'https://images.unsplash.com/photo-1559060017-445fb9722f2a?w=600&q=80',
    caption: 'River overflowing banks after storm surge. Roads cut off, bridges unsafe. Emergency services advising residents to shelter in place. Water supply contaminated.',
    severity: 'high',
  },
  {
    url: 'https://images.unsplash.com/photo-1596567786498-e02a5d65a637?w=600&q=80',
    caption: 'Flash flooding on main highway. Multiple vehicles stalled in waist-deep water. Traffic diverted. Tow trucks and emergency crews responding.',
    severity: 'medium',
  },
  // STORMS / HURRICANES
  {
    url: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=600&q=80',
    caption: 'Severe thunderstorm approaching city. Lightning strikes reported. Strong winds uprooting trees and damaging power lines. Residents advised to stay indoors.',
    severity: 'medium',
  },
  {
    url: 'https://images.unsplash.com/photo-1561553590-267fc716698a?w=600&q=80',
    caption: 'Storm aftermath — trees toppled across roads, power lines down. Major power outage affecting 50,000+ homes. Emergency crews working through the night to restore services.',
    severity: 'medium',
  },
  {
    url: 'https://images.unsplash.com/photo-1580354220714-69d44e2e1a08?w=600&q=80',
    caption: 'Hurricane damage to coastal structures. Roofs torn off, windows shattered. National Guard deployed for search and rescue. Emergency shelters at capacity.',
    severity: 'high',
  },
  // EARTHQUAKES / DESTRUCTION
  {
    url: 'https://images.unsplash.com/photo-1573152143286-0c422b4d2175?w=600&q=80',
    caption: 'Earthquake damage — partial building collapse in commercial area. Rubble on streets, cars crushed. Search and rescue teams using thermal sensors to locate trapped survivors.',
    severity: 'high',
  },
  {
    url: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=600&q=80',
    caption: 'Structural damage to apartment complex after seismic activity. Deep cracks visible on load-bearing walls. Building condemned. 200+ residents displaced.',
    severity: 'high',
  },
  // ACCIDENTS / EMERGENCY
  {
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80',
    caption: 'Major construction site collapse during heavy rain. Workers trapped under debris. Cranes deployed for heavy lifting. Multiple ambulances on standby.',
    severity: 'high',
  },
  {
    url: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=600&q=80',
    caption: 'Emergency response vehicles at accident scene on national highway. Multi-vehicle pile-up in foggy conditions. 3 critical injuries reported. Traffic backed up for kilometers.',
    severity: 'high',
  },
  {
    url: 'https://images.unsplash.com/photo-1587560699334-bea93391dcef?w=600&q=80',
    caption: 'Ambulance rushing through city streets to hospital. Multiple casualties from industrial accident. Blood banks alerted. Surgeons on standby at 3 hospitals.',
    severity: 'medium',
  },
  // SMOKE / POLLUTION / HAZMAT
  {
    url: 'https://images.unsplash.com/photo-1570299437522-04693adb4855?w=600&q=80',
    caption: 'Dense smoke from industrial fire covering entire district. Air quality index critical. Residents advised to wear masks and close windows. Schools closed for the day.',
    severity: 'medium',
  },
  {
    url: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=600&q=80',
    caption: 'Chemical leak at warehouse facility. Hazmat teams in protective gear assessing contamination. 500m exclusion zone established. Nearby schools evacuated.',
    severity: 'high',
  },
  // RESCUE / EMERGENCY RESPONSE
  {
    url: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&q=80',
    caption: 'Emergency medical teams providing aid at disaster site. Field hospital set up with triage stations. Volunteers distributing water and blankets to displaced families.',
    severity: 'medium',
  },
  {
    url: 'https://images.unsplash.com/photo-1597092451840-5e8f2d576505?w=600&q=80',
    caption: 'Fire department conducting rescue operation. Ladder truck deployed to reach upper floors. Smoke inhalation cases being treated on site. All residents accounted for.',
    severity: 'medium',
  },
];

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
  { message: 'Heavy flooding in Bellandur area. Water entering ground floor apartments. Residents stranded. Rescue boats needed.', severity: 'high' },
  { message: 'Suspicious package found near Majestic bus stand. Area being cordoned off. Bomb squad requested.', severity: 'high' },
  { message: 'Fire in electrical substation near Jayanagar causing power outage across 5 blocks. Sparks visible.', severity: 'medium' },
];

let imageIndex = 0;

function randomNearBangalore() {
  return {
    latitude: BANGALORE_CENTER.lat + (Math.random() - 0.5) * 0.12,
    longitude: BANGALORE_CENTER.lng + (Math.random() - 0.5) * 0.12,
  };
}

async function ensureUserExists(supabase, user) {
  const { data } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();
  if (!data) {
    await supabase.from('users').upsert({
      id: user.id,
      email: user.email || `unknown-${user.id}@domain.com`,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      role: user.user_metadata?.role || 'citizen',
    }, { onConflict: 'id' });
  }
}

async function createAndTriage(req, { type, message, severity }) {
  const supabase = getServiceClient();
  const coords = randomNearBangalore();
  await ensureUserExists(supabase, req.user);

  const { data: inserted, error: insErr } = await supabase
    .from('alerts')
    .insert({
      user_id: req.user.id, type, message,
      latitude: coords.latitude, longitude: coords.longitude,
      severity: severity || 'low', response_type: 'unknown', status: 'active',
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
    triage_result = [...row.triage_results].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
  }

  const payload = { ...row, triage_result };
  try { await broadcastAlert(supabase, { alert: payload }); } catch (e) { console.error('broadcast', e); }
  return payload;
}

async function simulateSocial(req, res) {
  try {
    let message, severity, simulationMeta;

    // 50% image (cycle through all 20), 50% text
    if (Math.random() < 0.5) {
      const img = IMAGE_REPORTS[imageIndex % IMAGE_REPORTS.length];
      imageIndex++;
      message = `[MEDIA:${img.url}] ${img.caption}`;
      severity = img.severity;
      simulationMeta = { source: 'verified_image', imageId: imageIndex };
    } else {
      const txt = TEXT_REPORTS[Math.floor(Math.random() * TEXT_REPORTS.length)];
      message = txt.message;
      severity = txt.severity;
      simulationMeta = { source: 'demo', type: 'text_report' };
    }

    const data = await createAndTriage(req, { type: 'social_post', message, severity });
    return res.status(201).json({ success: true, data: { ...data, simulation_meta: simulationMeta } });
  } catch (e) {
    console.error('simulateSocial', e);
    return res.status(500).json({ success: false, error: e.message || 'Simulation failed' });
  }
}

async function simulateSos(req, res) {
  try {
    const data = await createAndTriage(req, { type: 'sos_button', message: 'SOS triggered' });
    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error('simulateSos', e);
    return res.status(500).json({ success: false, error: e.message || 'Simulation failed' });
  }
}

module.exports = { simulateSocial, simulateSos };
