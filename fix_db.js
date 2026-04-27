/**
 * ResQ Database Cleanup & Role Fix Script
 * 
 * This script:
 * 1. Deletes ALL child records first (triage_results, messages, responder_assignments)
 * 2. Deletes ALL alerts
 * 3. Lists all users so you can see who has wrong roles
 * 4. Optionally fixes roles for specific emails
 * 
 * Run: node fix_db.js
 * To also fix a role: node fix_db.js fix user@email.com citizen
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const args = process.argv.slice(2);
  const isFixMode = args[0] === 'fix';
  const fixEmail = args[1];
  const fixRole = args[2]; // citizen, responder, or admin

  console.log('\n🔧 ResQ Database Cleanup\n');
  console.log('='.repeat(50));

  // Step 1: Delete child records (FK safe order)
  console.log('\n📦 Step 1: Cleaning child tables...');
  
  const { error: e1 } = await supabase.from('triage_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  triage_results:', e1 ? `❌ ${e1.message}` : '✅ cleaned');

  const { error: e2 } = await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  messages:', e2 ? `❌ ${e2.message}` : '✅ cleaned');

  const { error: e3 } = await supabase.from('responder_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  responder_assignments:', e3 ? `❌ ${e3.message}` : '✅ cleaned');

  // Step 2: Delete alerts (now safe because children are gone)
  console.log('\n📦 Step 2: Cleaning alerts...');
  const { error: e4 } = await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  alerts:', e4 ? `❌ ${e4.message}` : '✅ cleaned');

  // Step 3: List all users with their roles
  console.log('\n📋 Step 3: Current users in database:\n');
  const { data: users, error: userErr } = await supabase.from('users').select('id, email, full_name, role').order('email');
  
  if (userErr) {
    console.log('  ❌ Failed to list users:', userErr.message);
  } else if (!users || users.length === 0) {
    console.log('  No users found.');
  } else {
    console.log('  ' + '-'.repeat(70));
    console.log(`  ${'Email'.padEnd(35)} ${'Role'.padEnd(12)} Name`);
    console.log('  ' + '-'.repeat(70));
    for (const u of users) {
      console.log(`  ${(u.email || '?').padEnd(35)} ${(u.role || '?').padEnd(12)} ${u.full_name || '-'}`);
    }
    console.log('  ' + '-'.repeat(70));
    console.log(`  Total: ${users.length} users\n`);
  }

  // Step 4: Fix role if requested
  if (isFixMode && fixEmail && fixRole) {
    console.log(`\n🔄 Step 4: Fixing role for ${fixEmail} → ${fixRole}...`);
    
    // Fix in users table
    const { error: fixErr } = await supabase
      .from('users')
      .update({ role: fixRole })
      .eq('email', fixEmail);

    if (fixErr) {
      console.log(`  ❌ users table: ${fixErr.message}`);
    } else {
      console.log(`  ✅ users table role updated to "${fixRole}"`);
    }

    // Fix in Supabase Auth metadata
    // First find the user by email
    const user = users?.find(u => u.email === fixEmail);
    if (user) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { role: fixRole }
      });
      if (authErr) {
        console.log(`  ❌ auth metadata: ${authErr.message}`);
      } else {
        console.log(`  ✅ auth metadata role updated to "${fixRole}"`);
      }
    }
  } else if (!isFixMode) {
    console.log('💡 To fix a user\'s role, run:');
    console.log('   node fix_db.js fix user@email.com citizen');
    console.log('   node fix_db.js fix user@email.com responder');
    console.log('   node fix_db.js fix user@email.com admin\n');
  }

  console.log('\n✅ Database cleanup complete! Ready for fresh data.\n');
}

run().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
