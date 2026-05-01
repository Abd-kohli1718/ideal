/**
 * Fix: Add 'dispatched' to the alerts status CHECK constraint in Supabase.
 * This is needed so admin can dispatch verified alerts to responders.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fix() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Drop the old constraint and add new one with 'dispatched'
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_status_check;
      ALTER TABLE alerts ADD CONSTRAINT alerts_status_check CHECK (status IN ('active', 'dispatched', 'accepted', 'resolved'));
    `
  });

  if (error) {
    console.log('RPC method not available, trying direct SQL via REST...');
    // Fallback: use the Supabase SQL editor approach via fetch
    const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        query: `ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_status_check; ALTER TABLE alerts ADD CONSTRAINT alerts_status_check CHECK (status IN ('active', 'dispatched', 'accepted', 'resolved'));`
      })
    });
    if (!res.ok) {
      console.log('Direct SQL not available either.');
      console.log('');
      console.log('=== MANUAL FIX REQUIRED ===');
      console.log('Go to Supabase Dashboard → SQL Editor and run:');
      console.log('');
      console.log("  ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_status_check;");
      console.log("  ALTER TABLE alerts ADD CONSTRAINT alerts_status_check CHECK (status IN ('active', 'dispatched', 'accepted', 'resolved'));");
      console.log('');
    } else {
      console.log('✅ Status constraint updated successfully!');
    }
  } else {
    console.log('✅ Status constraint updated successfully!');
  }
}

fix();
