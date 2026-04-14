const { createClient } = require('@supabase/supabase-js');
const { getServiceClient } = require('../services/supabase');

function clientWithUserJwt(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}

async function signup(req, res) {
  const { email, password, full_name, role } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' });
  }

  const normalizedRole = ['citizen', 'responder', 'admin'].includes(role) ? role : 'citizen';

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || null,
          role: normalizedRole,
        },
      },
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    if (!data.user?.id) {
      return res.status(500).json({ success: false, error: 'Signup did not return a user id' });
    }

    const { error: insertErr } = await supabase.from('users').insert({
      id: data.user.id,
      email,
      full_name: full_name || null,
      role: normalizedRole,
    });

    if (insertErr) {
      console.error('auth signup: users insert failed', insertErr);
      if (insertErr.code === '23505') {
        return res.status(400).json({ success: false, error: 'An account with this email already exists. Please log in or use a different email.' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create profile' });
    }

    return res.status(201).json({
      success: true,
      data: {
        user: data.user,
        session: data.session,
      },
    });
  } catch (e) {
    console.error('signup', e);
    return res.status(500).json({ success: false, error: 'Signup failed' });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' });
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return res.status(401).json({ success: false, error: error?.message || 'Invalid credentials' });
    }

    return res.json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
        user: data.user,
      },
    });
  } catch (e) {
    console.error('login', e);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
}

async function logout(req, res) {
  const token = req.authToken;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' });
  }

  try {
    const supabase = clientWithUserJwt(token);
    const { error } = await supabase.auth.signOut();
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data: { logged_out: true } });
  } catch (e) {
    console.error('logout', e);
    return res.status(500).json({ success: false, error: 'Logout failed' });
  }
}

async function oauthSync(req, res) {
  try {
    const supabase = getServiceClient();
    const role = req.user?.user_metadata?.role || req.body?.role || 'citizen';
    const email = req.user?.email || 'unknown@domain.com';
    const full_name = req.user?.user_metadata?.full_name || req.user?.user_metadata?.name || null;

    // Upsert into public.users to fulfill foreign key constraints
    const { error } = await supabase.from('users').upsert({
      id: req.user.id,
      email: email,
      full_name: full_name,
      role: role
    }, { onConflict: 'id' });

    if (error) {
      console.error('oauthSync DB error', error);
      return res.status(500).json({ success: false, error: 'Failed to sync user profile' });
    }

    return res.json({ success: true, data: { synced: true, role } });
  } catch (e) {
    console.error('oauthSync', e);
    return res.status(500).json({ success: false, error: 'Failed during profile sync' });
  }
}

module.exports = { signup, login, logout, oauthSync };
