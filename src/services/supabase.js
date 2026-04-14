const { createClient } = require('@supabase/supabase-js');

let _client;

function getServiceClient() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/**
 * Broadcast a payload on the Realtime channel `alerts`.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Record<string, unknown>} payload
 */
async function broadcastAlert(supabase, payload) {
  const channel = supabase.channel('alerts');
  await new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      supabase.removeChannel(channel).finally(() =>
        reject(new Error('Realtime subscribe timeout'))
      );
    }, 15000);

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        if (done) return;
        done = true;
        clearTimeout(timer);
        channel
          .send({
            type: 'broadcast',
            event: 'new_alert',
            payload,
          })
          .then(() => supabase.removeChannel(channel))
          .then(() => resolve())
          .catch((e) =>
            supabase.removeChannel(channel).finally(() => reject(e))
          );
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        if (done) return;
        done = true;
        clearTimeout(timer);
        supabase.removeChannel(channel).finally(() =>
          reject(err || new Error(`Realtime subscribe failed: ${status}`))
        );
      }
    });
  });
}

module.exports = { getServiceClient, broadcastAlert };
