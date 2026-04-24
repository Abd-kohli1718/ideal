const { getServiceClient, broadcastAlert } = require('../services/supabase');
const { runTriage } = require('../services/triageService');

const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

// ═══════════════════════════════════════════════════════════════════
// 20 REAL DISASTER INCIDENTS — curated with working Unsplash images
// Each is a unique, real-world emergency scenario
// ═══════════════════════════════════════════════════════════════════
const DISASTER_INCIDENTS = [
  {
    image: 'https://images.unsplash.com/photo-1473260079959-28e8bee5d782?w=800&h=450&fit=crop',
    caption: 'WILDFIRE ALERT: Massive wildfire engulfing hillside forest. Flames visible across 3km stretch. Residential colony at risk. All fire stations deployed. Mandatory evacuation for sectors 7-12.',
    severity: 'high', response: 'fire',
  },
  {
    image: 'https://images.unsplash.com/photo-1602980175-0569a7daee56?w=800&h=450&fit=crop',
    caption: 'STRUCTURE FIRE: Multi-story commercial building ablaze on MG Road. Heavy smoke, upper 3 floors fully involved. 12 fire tenders responding. Road closed. 40+ people evacuated.',
    severity: 'high', response: 'fire',
  },
  {
    image: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&h=450&fit=crop',
    caption: 'SEVERE FLOODING: Streets completely submerged after 72hrs continuous rainfall. Water level 4ft on main roads. 200+ vehicles stranded. Army rescue boats deployed for trapped residents.',
    severity: 'high', response: 'rescue',
  },
  {
    image: 'https://images.unsplash.com/photo-1559060017-445fb9722f2a?w=800&h=450&fit=crop',
    caption: 'FLOOD EMERGENCY: River breached embankment near Ulsoor. Low-lying areas inundated. 500+ families displaced. Relief camps activated at 3 schools. Clean water supply disrupted.',
    severity: 'high', response: 'rescue',
  },
  {
    image: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=800&h=450&fit=crop',
    caption: 'SEVERE STORM: Category-3 thunderstorm approaching city. Lightning strikes reported every 2 minutes. 15 trees uprooted. Power outage across 6 wards. Citizens advised to stay indoors.',
    severity: 'medium', response: 'rescue',
  },
  {
    image: 'https://images.unsplash.com/photo-1580354220714-69d44e2e1a08?w=800&h=450&fit=crop',
    caption: 'CYCLONE DAMAGE: Coastal structures severely damaged by cyclonic winds at 120kmph. Roofs ripped off 50+ homes. National Guard deployed. Emergency shelters operating at full capacity.',
    severity: 'high', response: 'rescue',
  },
  {
    image: 'https://images.unsplash.com/photo-1573152143286-0c422b4d2175?w=800&h=450&fit=crop',
    caption: 'EARTHQUAKE: 5.8 magnitude earthquake — partial building collapse in Jayanagar commercial zone. Rubble blocking roads. Search & rescue teams with K9 units dispatched. 3 trapped survivors confirmed.',
    severity: 'high', response: 'rescue',
  },
  {
    image: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&h=450&fit=crop',
    caption: 'BUILDING DAMAGE: Apartment complex showing dangerous structural cracks after seismic tremors. Load-bearing walls compromised. Building condemned. 180 residents relocated to temporary shelters.',
    severity: 'high', response: 'rescue',
  },
  {
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=450&fit=crop',
    caption: 'CONSTRUCTION COLLAPSE: Crane collapse at metro construction site in Whitefield. 6 workers trapped under concrete debris. Heavy machinery deployed. Multiple ambulances on standby.',
    severity: 'high', response: 'ambulance',
  },
  {
    image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&h=450&fit=crop',
    caption: 'HIGHWAY ACCIDENT: Multi-vehicle pileup on Bangalore-Mysore expressway. Dense fog, 8 vehicles involved. 5 critical injuries. Traffic diverted via alternate routes. Air ambulance requested.',
    severity: 'high', response: 'ambulance',
  },
  {
    image: 'https://images.unsplash.com/photo-1587560699334-bea93391dcef?w=800&h=450&fit=crop',
    caption: 'MEDICAL EMERGENCY: Industrial chemical exposure at Peenya factory. 23 workers showing respiratory distress. 4 ambulances dispatched. Hazmat team assessing contamination radius.',
    severity: 'medium', response: 'ambulance',
  },
  {
    image: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&h=450&fit=crop',
    caption: 'DISASTER RELIEF: Field hospital operational at flood relief site. 150+ patients treated in 24hrs. Blood bank supplies running low. Volunteer doctors needed urgently at Sector 9 camp.',
    severity: 'medium', response: 'ambulance',
  },
  {
    image: 'https://images.unsplash.com/photo-1599228700045-55e253e3e9bd?w=800&h=450&fit=crop',
    caption: 'RESIDENTIAL FIRE: House fire in Koramangala 5th Block. Kitchen gas cylinder exploded. Family of 4 rescued from rooftop. 2 fire engines on scene. Adjacent buildings being evacuated.',
    severity: 'high', response: 'fire',
  },
  {
    image: 'https://images.unsplash.com/photo-1561553590-267fc716698a?w=800&h=450&fit=crop',
    caption: 'STORM AFTERMATH: Trees blocking main arterial roads across 4 zones. Power lines down in Indiranagar and HSR Layout. 45,000 homes without electricity. BESCOM crews working through night.',
    severity: 'medium', response: 'rescue',
  },
  {
    image: 'https://images.unsplash.com/photo-1570299437522-04693adb4855?w=800&h=450&fit=crop',
    caption: 'TOXIC SMOKE: Dense smoke from warehouse fire in Electronic City. AQI exceeding 500. Schools within 5km radius closed. Residents advised to wear N95 masks and keep windows sealed.',
    severity: 'medium', response: 'fire',
  },
  {
    image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&h=450&fit=crop',
    caption: 'HAZMAT INCIDENT: Chemical spill at paint factory, Bommasandra Industrial Area. Unknown substances leaking into storm drain. 800m exclusion zone. Environmental response team deployed.',
    severity: 'high', response: 'rescue',
  },
  {
    image: 'https://images.unsplash.com/photo-1613169803738-244fa2a4cae5?w=800&h=450&fit=crop',
    caption: 'URBAN FLOODING: Underpass near Silk Board completely waterlogged. 15 vehicles submerged. Rescue divers searching for occupants. Traffic police redirecting all vehicles via service road.',
    severity: 'high', response: 'rescue',
  },
  {
    image: 'https://images.unsplash.com/photo-1486551937199-baf066858de7?w=800&h=450&fit=crop',
    caption: 'FOREST FIRE SPREAD: Bannerghatta National Park boundary fire spreading rapidly due to dry winds at 40kmph. Wildlife evacuation initiated. 8 fire stations from 3 districts mobilized.',
    severity: 'high', response: 'fire',
  },
  {
    image: 'https://images.unsplash.com/photo-1596567786498-e02a5d65a637?w=800&h=450&fit=crop',
    caption: 'FLASH FLOODS: Sudden flash flooding on Outer Ring Road after cloud burst. Water rising at 1ft/hour. NDRF team deployed with inflatable boats. 80+ people rescued from rooftops so far.',
    severity: 'high', response: 'rescue',
  },
  {
    image: 'https://images.unsplash.com/photo-1597092451840-5e8f2d576505?w=800&h=450&fit=crop',
    caption: 'RESCUE OPERATION: Fire department conducting high-rise rescue operation in JP Nagar. Ladder truck deployed to 8th floor. 12 residents with smoke inhalation being treated on site.',
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

async function createAndTriage(req, { type, message, severity, response_type }) {
  const supabase = getServiceClient();
  const coords = randomNearBangalore();
  await ensureUserExists(supabase, req.user);

  const { data: inserted, error: insErr } = await supabase
    .from('alerts')
    .insert({
      user_id: req.user.id, type, message,
      latitude: coords.latitude, longitude: coords.longitude,
      severity: severity || 'low',
      response_type: response_type || 'unknown',
      status: 'active',
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

  const payload = { ...row, triage_result };
  try { await broadcastAlert(supabase, { alert: payload }); } catch (e) { console.error('broadcast', e); }
  return payload;
}

async function simulateSocial(req, res) {
  try {
    // Cycle through 20 incidents sequentially
    const incident = DISASTER_INCIDENTS[incidentIndex % DISASTER_INCIDENTS.length];
    incidentIndex++;

    const message = `[MEDIA:${incident.image}] ${incident.caption}`;
    const data = await createAndTriage(req, {
      type: 'social_post',
      message,
      severity: incident.severity,
      response_type: incident.response,
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
    const data = await createAndTriage(req, { type: 'sos_button', message: 'SOS triggered' });
    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error('simulateSos', e);
    return res.status(500).json({ success: false, error: e.message || 'Simulation failed' });
  }
}

module.exports = { simulateSocial, simulateSos };
