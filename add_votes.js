require('dotenv').config();

async function addVotesColumn() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  
  // Extract project ref from URL
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  
  // Use Supabase's SQL execution via the pg_net extension or direct SQL API
  // Actually the simplest way is to use the /rest/v1/rpc endpoint with a function
  // But we need to create the function first. Let's use a different approach.
  
  // Try the Supabase SQL API endpoint (available for service role)
  const sql = `
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alerts' AND column_name='votes') THEN
        ALTER TABLE alerts ADD COLUMN votes INTEGER DEFAULT 0;
      END IF;
    END $$;
  `;
  
  // Use the pg endpoint
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });
  
  console.log('Status:', res.status);
  if (res.status !== 200) {
    console.log('\nThe votes column needs to be added manually.');
    console.log('Go to: https://supabase.com/dashboard → SQL Editor → Run:');
    console.log('\n  ALTER TABLE alerts ADD COLUMN IF NOT EXISTS votes INTEGER DEFAULT 0;\n');
    console.log('Or we can work around it by storing votes in the frontend only.');
  }
}

addVotesColumn();
