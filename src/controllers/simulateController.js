const { getServiceClient, broadcastAlert } = require('../services/supabase');
const { runTriage } = require('../services/triageService');

const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

// ═══════════════════════════════════════════════════════════════
// 20 CURATED IMAGE REPORTS — Real CrisisMMD disaster images
// stored permanently in Supabase Storage
// ═══════════════════════════════════════════════════════════════
const IMAGE_REPORTS = [
  // WILDFIRES (1-4)
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/wildfire_01.jpg',
    caption: 'Wildfire spreading rapidly through dry vegetation near residential zone. Thick smoke reducing visibility. Evacuation orders issued. Fire department deploying aerial support.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/wildfire_02.jpg',
    caption: 'Massive wildfire engulfing hillside. Flames visible from kilometers away. Multiple structures threatened. All available fire units dispatched to contain the blaze.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/wildfire_03.jpg',
    caption: 'Wildfire aftermath — charred landscape and destroyed property. Residents returning to assess damage. Air quality advisory in effect for surrounding areas.',
    severity: 'medium',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/wildfire_04.jpg',
    caption: 'Active wildfire burning near community buildings. Embers carried by wind creating spot fires. Mandatory evacuation zone expanded to 5 km radius.',
    severity: 'high',
  },
  // HURRICANE HARVEY (5-7)
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_harvey_05.jpg',
    caption: 'Hurricane Harvey devastation — severe flooding across residential streets. Vehicles submerged. Coast Guard conducting water rescues. Shelters at capacity.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_harvey_06.jpg',
    caption: 'Storm surge damage from Hurricane Harvey. Buildings partially collapsed. Power outage affecting thousands. FEMA teams deploying emergency supplies.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_harvey_07.jpg',
    caption: 'Flooded neighborhood after Hurricane Harvey. Water level exceeding 4 feet. Residents trapped on rooftops. Rescue boats and helicopters mobilized.',
    severity: 'high',
  },
  // HURRICANE IRMA (8-10)
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_irma_08.jpg',
    caption: 'Hurricane Irma impact — widespread infrastructure damage. Trees uprooted, power lines down across multiple blocks. Emergency crews clearing roadways.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_irma_09.jpg',
    caption: 'Coastal destruction from Hurricane Irma. Beach erosion and structural damage to waterfront properties. National Guard assisting with evacuations.',
    severity: 'medium',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_irma_10.jpg',
    caption: 'Hurricane Irma aftermath — debris scattered across streets, damaged rooftops visible. Emergency shelters providing food and water to displaced families.',
    severity: 'medium',
  },
  // HURRICANE MARIA (11-12)
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_maria_11.jpg',
    caption: 'Catastrophic damage from Hurricane Maria. Entire blocks without power or running water. Communication systems down. International aid being coordinated.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/hurricane_maria_12.jpg',
    caption: 'Hurricane Maria destruction — collapsed structures and flooded roads. Medical facilities overwhelmed. Red Cross setting up field hospitals.',
    severity: 'high',
  },
  // IRAQ-IRAN EARTHQUAKE (13-15)
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/earthquake_13.jpg',
    caption: 'Major earthquake damage — buildings reduced to rubble. Search and rescue operations underway. Aftershocks continuing, residents warned to stay outdoors.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/earthquake_14.jpg',
    caption: 'Earthquake aftermath — structural collapse in commercial district. Heavy machinery deployed for debris removal. Casualty count still being assessed.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/earthquake_15.jpg',
    caption: 'Earthquake damage to residential buildings. Cracks visible on load-bearing walls. Engineers conducting structural safety inspections. Residents temporarily relocated.',
    severity: 'medium',
  },
  // MEXICO EARTHQUAKE (16-18)
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/earthquake_mexico_16.jpg',
    caption: 'Mexico earthquake — multi-story building partially collapsed. Rescue teams using thermal imaging to locate survivors. Volunteers forming human chains to clear debris.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/earthquake_mexico_17.jpg',
    caption: 'Earthquake devastation in urban area. Roads cracked, vehicles damaged by falling debris. Emergency services overwhelmed. Military deployed for relief operations.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/earthquake_mexico_18.jpg',
    caption: 'Post-earthquake scene — damaged infrastructure and displaced families. Temporary shelters being erected. Water and food distribution points established.',
    severity: 'medium',
  },
  // SRI LANKA FLOODS (19-20)
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/flood_19.jpg',
    caption: 'Severe flooding — streets completely submerged after continuous heavy rainfall. Boats being used for transportation. Hundreds displaced from low-lying areas.',
    severity: 'high',
  },
  {
    url: 'https://xalulznuowuijzpmevma.supabase.co/storage/v1/object/public/media/disasters/flood_20.jpg',
    caption: 'Flood waters rising in residential area. Ground floors inundated. Army rescue teams evacuating elderly and children. Relief camps set up on higher ground.',
    severity: 'high',
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
  { message: 'Minor road accident near Huda City Centre. Two vehicles involved, no major injuries. Traffic diverted.', severity: 'low' },
  { message: 'Road cave-in on Hosur Main Road after water pipeline burst. Traffic blocked. Municipal workers dispatched.', severity: 'low' },
  { message: 'Fire in electrical substation near Jayanagar causing power outage across 5 blocks. Sparks visible.', severity: 'medium' },
];

// Track which image was used last to cycle through all 20
let imageIndex = 0;

function randomNearBangalore() {
  const dLat = (Math.random() - 0.5) * 0.12;
  const dLng = (Math.random() - 0.5) * 0.12;
  return {
    latitude: BANGALORE_CENTER.lat + dLat,
    longitude: BANGALORE_CENTER.lng + dLng,
  };
}

async function ensureUserExists(supabase, user) {
  const { data } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();
  if (!data) {
    const email = user.email || `unknown-${user.id}@domain.com`;
    const full_name = user.user_metadata?.full_name || user.user_metadata?.name || null;
    const role = user.user_metadata?.role || 'citizen';
    await supabase.from('users').upsert({ id: user.id, email, full_name, role }, { onConflict: 'id' });
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

  const { data: updated, error: fetchErr } = await supabase
    .from('alerts').select('*, triage_results(*)').eq('id', inserted.id).single();
  if (fetchErr) console.error('simulate refetch', fetchErr);

  const row = updated || inserted;
  const triageList = row.triage_results;
  let triage_result = null;
  if (Array.isArray(triageList) && triageList.length > 0) {
    triage_result = [...triageList].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
  }

  const payload = { ...row, triage_result };
  try { await broadcastAlert(supabase, { alert: payload }); } catch (bErr) { console.error('simulate broadcast', bErr); }
  return payload;
}

async function simulateSocial(req, res) {
  try {
    let message, severity;
    let simulationMeta = { source: 'demo' };

    // 50% image, 50% text — images cycle through all 20 sequentially
    if (Math.random() < 0.5) {
      const img = IMAGE_REPORTS[imageIndex % IMAGE_REPORTS.length];
      imageIndex++;
      message = `[MEDIA:${img.url}] ${img.caption}`;
      severity = img.severity;
      simulationMeta = { source: 'crisisMMD', type: 'image_report', imageId: imageIndex };
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
