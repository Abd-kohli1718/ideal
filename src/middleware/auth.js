const { getServiceClient } = require('../services/supabase');

async function verifySupabaseJwt(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' });
  }

  try {
    const supabase = getServiceClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    req.authToken = token;
    req.user = user;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}

async function requireResponder(req, res, next) {
  const role = req.user?.user_metadata?.role;
  if (role === 'responder' || role === 'admin') {
    return next();
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!error && (data?.role === 'responder' || data?.role === 'admin')) {
      return next();
    }
  } catch {
    // fall through
  }

  return res.status(403).json({ success: false, error: 'Responder access required' });
}

module.exports = { verifySupabaseJwt, requireResponder };
