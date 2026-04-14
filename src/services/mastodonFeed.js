/**
 * Fetch a random post from a Mastodon-compatible instance public timeline.
 * No API key or billing — uses standard Mastodon REST:
 * GET /api/v1/timelines/public
 *
 * Set MASTODON_INSTANCE (e.g. https://mastodon.social) in .env to choose the server.
 */

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const noTags = html.replace(/<[^>]*>/g, ' ');
  return decodeBasicEntities(noTags).replace(/\s+/g, ' ').trim();
}

function decodeBasicEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function instanceBase() {
  const raw = process.env.MASTODON_INSTANCE || 'https://mastodon.social';
  return raw.replace(/\/$/, '');
}

/**
 * @returns {Promise<{ text: string, author: string | undefined, statusUrl: string | undefined, instance: string } | null>}
 */
async function fetchRandomPublicPost() {
  const base = instanceBase();
  const url = `${base}/api/v1/timelines/public?limit=40`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Mastodon HTTP ${res.status}`);
  }

  const statuses = await res.json();
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return null;
  }

  const candidates = statuses.filter((s) => s && s.content && !s.reblog && !s.sensitive);
  if (candidates.length === 0) {
    return null;
  }

  const s = candidates[Math.floor(Math.random() * candidates.length)];
  let text = stripHtml(s.content);
  if (text.length > 500) text = `${text.slice(0, 497)}...`;
  if (text.length < 8) return null;

  return {
    text,
    author: s.account?.acct || s.account?.username,
    statusUrl: typeof s.url === 'string' ? s.url : undefined,
    instance: base,
  };
}

module.exports = { fetchRandomPublicPost, instanceBase };
