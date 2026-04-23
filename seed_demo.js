/**
 * Clear old demo alerts and re-seed with working images.
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
    message: 'Major fire at warehouse in Whitefield industrial area. Multiple fire trucks needed. People trapped on 2nd floor. Thick black smoke visible from 5km away. Urgent rescue required.',
    latitude: 12.9698,
    longitude: 77.7500,
    severity: 'high',
    response_type: 'fire',
    status: 'active',
  },
  {
    type: 'sos_button',
    message: 'SOS — Severe multi-vehicle accident on Outer Ring Road near Marathahalli bridge. 3 vehicles involved including a bus, multiple casualties reported, ambulance urgently needed.',
    latitude: 12.9565,
    longitude: 77.7015,
    severity: 'high',
    response_type: 'ambulance',
    status: 'active',
  },
  {
    type: 'social_post',
    message: '[MEDIA:https://picsum.photos/id/274/600/400] Heavy flooding in Koramangala area after 6 hours of continuous rain. Water level rising above knee height. Several cars submerged. Rescue boats needed immediately.',
    latitude: 12.9352,
    longitude: 77.6245,
    severity: 'high',
    response_type: 'rescue',
    status: 'active',
  },
  {
    type: 'social_post',
    message: '[MEDIA:https://picsum.photos/id/1040/600/400] Building wall collapsed near Majestic bus stand after construction work. Debris blocking the main road. Minor injuries reported. Police and rescue team needed on site.',
    latitude: 12.9767,
    longitude: 77.5713,
    severity: 'medium',
    response_type: 'rescue',
    status: 'active',
  },
  {
    type: 'social_post',
    message: '[MEDIA:https://picsum.photos/id/1039/600/400] Gas leak detected in apartment complex in Indiranagar. Strong odor spreading to 3 floors. Residents evacuating. Fire department has been alerted and is en route.',
    latitude: 12.9719,
    longitude: 77.6412,
    severity: 'medium',
    response_type: 'fire',
    status: 'active',
  },
];

async function seed() {
  console.log('\n  Clearing old demo alerts and re-seeding...\n');

  // Get a user from public.users table
  const { data: pubUsers } = await supabase.from('users').select('id, email, full_name, role').limit(1);
  if (!pubUsers?.length) {
    console.log('  No users found. Create an account first.');
    return;
  }

  const userId = pubUsers[0].id;
  const userEmail = pubUsers[0].email;
  console.log(`  User: ${userEmail}\n`);

  // Delete ALL existing alerts
  const { error: delErr } = await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error('  Delete failed:', delErr.message);
  } else {
    console.log('  Cleared all old alerts.\n');
  }

  // Insert fresh demos
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
      const cleanMsg = alert.message.replace(/\[MEDIA:[^\]]+\]\s*/g, '');
      const hasMedia = alert.message.includes('[MEDIA:');
      console.log(`  OK [${data.severity}]${hasMedia ? ' [IMG]' : '      '}: ${cleanMsg.slice(0, 55)}...`);
    }
  }

  console.log('\n  Done! 5 fresh demo alerts seeded (2 text + 3 images).\n');
}

seed();
