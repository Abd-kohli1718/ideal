/**
 * Seed 5 demo alerts directly using the Supabase service key.
 * Run: node seed_demo.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const DEMO_ALERTS = [
  {
    type: 'social_post',
    message: 'Major fire at warehouse in Whitefield industrial area. Multiple fire trucks needed. People trapped on 2nd floor. Thick black smoke visible from 5km away.',
    latitude: 12.9698,
    longitude: 77.7500,
    severity: 'high',
    response_type: 'fire',
    status: 'active',
  },
  {
    type: 'sos_button',
    message: 'SOS — Severe road accident on Outer Ring Road near Marathahalli bridge. 3 vehicles involved, casualties reported, ambulance urgently needed.',
    latitude: 12.9565,
    longitude: 77.7015,
    severity: 'high',
    response_type: 'ambulance',
    status: 'active',
  },
  {
    type: 'social_post',
    message: '[MEDIA:https://images.unsplash.com/photo-1599709800893-23f73ab5a4b0?w=600] Heavy flooding in Koramangala area after 6 hours of continuous rain. Water level rising above knee height. Several cars submerged. Rescue boats needed.',
    latitude: 12.9352,
    longitude: 77.6245,
    severity: 'high',
    response_type: 'rescue',
    status: 'active',
  },
  {
    type: 'social_post',
    message: '[MEDIA:https://images.unsplash.com/photo-1621188998799-db932ff31a67?w=600] Building wall collapsed near Majestic bus stand after construction work. Debris blocking the main road. Minor injuries reported. Police and rescue team needed.',
    latitude: 12.9767,
    longitude: 77.5713,
    severity: 'medium',
    response_type: 'rescue',
    status: 'active',
  },
  {
    type: 'social_post',
    message: '[MEDIA:https://images.unsplash.com/photo-1583946099379-8c1b40b5841f?w=600] Gas leak detected in apartment complex in Indiranagar. Strong odor spreading to 3 floors. Residents evacuating. Fire department alerted.',
    latitude: 12.9719,
    longitude: 77.6412,
    severity: 'medium',
    response_type: 'fire',
    status: 'active',
  },
];

async function seed() {
  console.log('\n  Seeding 5 demo alerts...\n');

  // Get all auth users and ensure they exist in public.users
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 10 });
  
  if (!authUsers?.users?.length) {
    console.log('  No users found in auth. Please create an account first.');
    return;
  }

  const userId = authUsers.users[0].id;
  const userEmail = authUsers.users[0].email;
  const userName = authUsers.users[0].user_metadata?.full_name || authUsers.users[0].user_metadata?.name || 'Demo User';

  // Ensure user exists in public.users table (fixes FK constraint)
  console.log(`  Syncing user ${userEmail} to public.users...`);
  const { error: upsertErr } = await supabase.from('users').upsert({
    id: userId,
    email: userEmail,
    full_name: userName,
    role: authUsers.users[0].user_metadata?.role || 'citizen',
  }, { onConflict: 'id' });

  if (upsertErr) {
    console.error('  Failed to sync user:', upsertErr.message);
    return;
  }
  console.log(`  User synced: ${userId}\n`);

  // Insert alerts
  for (const alert of DEMO_ALERTS) {
    const { data, error } = await supabase
      .from('alerts')
      .insert({ ...alert, user_id: userId })
      .select()
      .single();

    if (error) {
      console.error(`  FAILED: ${alert.message.slice(0, 50)}...`);
      console.error(`    Error: ${error.message}`);
    } else {
      console.log(`  OK [${data.severity}]: ${alert.message.replace(/\[MEDIA:[^\]]+\]\s*/g, '').slice(0, 60)}...`);
    }
  }

  console.log('\n  Done! Demo alerts seeded.\n');
}

seed();
