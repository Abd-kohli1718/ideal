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
  'Gas leak detected in apartment complex in Indiranagar. Strong odor spreading to 3 floors. Residents evacuating. Fire department has been alerted and is en route.',
  'Massive pile-up on the highway near Hosur road. At least 8 vehicles involved. Multiple injuries reported. Ambulances needed.',
  'Fire in electrical substation near Jayanagar causing power outage across 5 blocks. Sparks visible. BESCOM notified.',
  'Drunk driver crashed into roadside stalls near Shivajinagar. 2 bystanders injured. Police and ambulance requested.',
  'Heavy flooding in Bellandur area. Water entering ground floor apartments. Residents stranded on upper floors. Rescue boats needed.',
  'Suspicious package found near Majestic bus stand. Area being cordoned off. Bomb squad requested.',
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
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!data) {
    // User doesn't exist in public.users — insert them
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
      // Don't throw immediately, it might have been created concurrently
      // The alert insert will fail with a clearer foreign key error if it really failed
    }
  }
}

async function createAndTriage(req, { type, message, severity }) {
  const supabase = getServiceClient();
  const coords = randomNearBangalore();

  // FIX: Ensure user exists in public.users before inserting alert
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

    // If no external source produced a message, pick a random text-only demo
    if (!message) {
      message = TEXT_REPORTS[Math.floor(Math.random() * TEXT_REPORTS.length)];
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
