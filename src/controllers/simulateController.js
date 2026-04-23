const { getServiceClient, broadcastAlert } = require('../services/supabase');
const { runTriage } = require('../services/triageService');
const { fetchRandomPublicPost } = require('../services/mastodonFeed');
const { fetchRandomRedditPost } = require('../services/redditFeed');

const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

// Realistic text-only emergency reports
const TEXT_REPORTS = [
  'Major accident on Outer Ring Road near Silk Board — multiple vehicles, people trapped, need ambulance urgently.',
  'Fire broke out in a commercial building on MG Road, thick smoke visible from Brigade Road side.',
  'Someone collapsed at the metro station platform, not breathing properly, please send medical help.',
  'Large crowd disturbance near college gate, possible fight, police needed immediately.',
  'Gas smell very strong in the apartment basement, worried about leak, need fire department.',
  'Tree fallen on road blocking traffic near Ulsoor, injured pedestrians reported.',
  'Flooding on the underpass after heavy rain, car stuck with people inside, rescue team needed.',
  'Loud explosion heard near industrial area, not sure what it is, sending this for help.',
  'Child missing near park playground for 30 minutes, need police assistance to coordinate search.',
  'Power lines sparking on the street after storm, risk of fire, stay clear and send emergency crew.',
  'Building tilting dangerously after heavy rains in Majestic area. Residents evacuated. Structural engineers needed.',
  'Chemical spill at factory in Peenya Industrial Area. Strong fumes spreading. Hazmat team required immediately.',
  'Elderly person found unconscious on footpath near Cubbon Park. No ID found. Need ambulance and police.',
  'Landslide blocking Mysore Road after continuous rainfall. Several vehicles stranded. NDRF team requested.',
];

// Image-based emergency reports (with Unsplash disaster images)
const IMAGE_REPORTS = [
  {
    message: '[MEDIA:https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600] Massive fire engulfing commercial complex in JP Nagar. Flames visible from kilometers away. Multiple fire tenders dispatched. Evacuations underway.',
    severity: 'high',
  },
  {
    message: '[MEDIA:https://images.unsplash.com/photo-1599709800893-23f73ab5a4b0?w=600] Severe waterlogging in Koramangala after 4 hours of continuous rainfall. Water level crossing 3 feet on main road. Multiple vehicles submerged.',
    severity: 'high',
  },
  {
    message: '[MEDIA:https://images.unsplash.com/photo-1621188998799-db932ff31a67?w=600] Partial building collapse reported near Majestic bus terminal. Debris on roadway. No casualties confirmed yet but rescue teams searching.',
    severity: 'high',
  },
  {
    message: '[MEDIA:https://images.unsplash.com/photo-1583946099379-8c1b40b5841f?w=600] Gas leak from pipeline near residential apartments in Indiranagar. Strong chemical odor. Fire department on scene, residents evacuating 3 blocks.',
    severity: 'medium',
  },
  {
    message: '[MEDIA:https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=600] Multi-vehicle pile-up on NICE Road during fog. At least 5 cars and 2 trucks involved. Ambulances rushing to scene. Traffic diverted.',
    severity: 'high',
  },
  {
    message: '[MEDIA:https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=600] Heavy storm damage in Whitefield area. Trees uprooted, power lines down across multiple streets. BESCOM teams working to restore power.',
    severity: 'medium',
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

async function createAndTriage(req, { type, message, severity }) {
  const supabase = getServiceClient();
  const coords = randomNearBangalore();

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
    const src = req.query.source || req.body?.source || 'auto';

    let message;
    let severity;
    /** @type {Record<string, unknown>} */
    let simulationMeta = { source: 'demo' };

    async function tryReddit() {
      try {
        const post = await fetchRandomRedditPost();
        if (!post) return false;
        message = post.text;
        simulationMeta = {
          source: 'reddit',
          subreddit: post.subreddit,
          permalink: post.permalink,
          author: post.author,
        };
        return true;
      } catch (err) {
        console.warn('simulateSocial: Reddit failed', err.message);
        return false;
      }
    }

    async function tryMastodon() {
      try {
        const post = await fetchRandomPublicPost();
        if (!post) return false;
        message = post.text;
        simulationMeta = {
          source: 'mastodon',
          author: post.author,
          statusUrl: post.statusUrl,
          instance: post.instance,
        };
        return true;
      } catch (err) {
        console.warn('simulateSocial: Mastodon failed', err.message);
        return false;
      }
    }

    if (src === 'demo') {
      // use demo text only
    } else if (src === 'reddit') {
      await tryReddit();
    } else if (src === 'mastodon') {
      await tryMastodon();
    } else {
      // auto: Reddit -> Mastodon -> demo
      if (!(await tryReddit())) {
        await tryMastodon();
      }
    }

    // If no external source produced a message, pick a random demo
    if (!message) {
      // 40% chance of image report, 60% text-only
      if (Math.random() < 0.4) {
        const imgReport = IMAGE_REPORTS[Math.floor(Math.random() * IMAGE_REPORTS.length)];
        message = imgReport.message;
        severity = imgReport.severity;
        simulationMeta = { source: 'demo', type: 'image_report' };
      } else {
        message = TEXT_REPORTS[Math.floor(Math.random() * TEXT_REPORTS.length)];
        simulationMeta = { source: 'demo', type: 'text_report' };
      }
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
