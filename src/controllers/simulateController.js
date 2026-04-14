const { getServiceClient, broadcastAlert } = require('../services/supabase');
const { runTriage } = require('../services/triageService');
const { fetchRandomPublicPost } = require('../services/mastodonFeed');
const { fetchRandomRedditPost } = require('../services/redditFeed');

const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

const SOCIAL_POSTS = [
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
];

function randomNearBangalore() {
  const dLat = (Math.random() - 0.5) * 0.12;
  const dLng = (Math.random() - 0.5) * 0.12;
  return {
    latitude: BANGALORE_CENTER.lat + dLat,
    longitude: BANGALORE_CENTER.lng + dLng,
  };
}

async function createAndTriage(req, { type, message }) {
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
      severity: 'low',
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
      // auto: Reddit → Mastodon → demo
      if (!(await tryReddit())) {
        await tryMastodon();
      }
    }

    if (!message) {
      message = SOCIAL_POSTS[Math.floor(Math.random() * SOCIAL_POSTS.length)];
      simulationMeta = { source: 'demo' };
    }

    const data = await createAndTriage(req, { type: 'social_post', message });
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
