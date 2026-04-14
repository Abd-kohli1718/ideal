/**
 * Fetch a random post title/body from a public subreddit via Reddit's .json API.
 * No API key or billing — read-only public data.
 *
 * Reddit expects a descriptive User-Agent (see https://github.com/reddit-archive/reddit/wiki/API)
 * Set REDDIT_USER_AGENT in .env in production if you deploy widely.
 *
 * Set REDDIT_SUBREDDIT (e.g. news, worldnews, india) — no "r/" prefix.
 */

function normalizeSubreddit() {
  const raw = process.env.REDDIT_SUBREDDIT || 'news';
  const s = raw.replace(/^r\//i, '').replace(/[^a-zA-Z0-9_]/g, '');
  return s || 'news';
}

function userAgent() {
  return (
    process.env.REDDIT_USER_AGENT ||
    'ResQPrototype/1.0 (college emergency-response demo; not a bulk scraper)'
  );
}

/**
 * @returns {Promise<{ text: string, subreddit: string, permalink?: string, author?: string } | null>}
 */
async function fetchRandomRedditPost() {
  const sub = normalizeSubreddit();
  const url = `https://www.reddit.com/r/${sub}/hot.json?limit=30&raw_json=1`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent(),
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Reddit HTTP ${res.status}`);
  }

  const body = await res.json();
  const children = body?.data?.children;
  if (!Array.isArray(children) || children.length === 0) {
    return null;
  }

  const posts = children
    .map((c) => c?.data)
    .filter(
      (d) =>
        d &&
        !d.stickied &&
        !d.over_18 &&
        typeof d.title === 'string' &&
        d.title.trim().length > 0
    );

  if (posts.length === 0) {
    return null;
  }

  const p = posts[Math.floor(Math.random() * posts.length)];
  let text = p.title.trim();
  if (p.is_self && typeof p.selftext === 'string' && p.selftext.trim()) {
    text = `${text}\n\n${p.selftext.trim()}`;
  }
  if (text.length > 500) {
    text = `${text.slice(0, 497)}...`;
  }
  if (text.length < 5) {
    return null;
  }

  const permalink =
    typeof p.permalink === 'string' ? `https://www.reddit.com${p.permalink}` : undefined;

  return {
    text,
    subreddit: sub,
    permalink,
    author: typeof p.author === 'string' ? p.author : undefined,
  };
}

module.exports = { fetchRandomRedditPost, normalizeSubreddit };
