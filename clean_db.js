require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function clean() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Delete dependent records first (FK constraints)
  const { error: e1 } = await supabase.from('triage_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Triage cleanup:', e1 ? e1.message : 'OK');

  const { error: eMsg } = await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Messages cleanup:', eMsg ? eMsg.message : 'OK');

  const { error: eAssign } = await supabase.from('responder_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Responder assignments cleanup:', eAssign ? eAssign.message : 'OK');

  // Delete all alerts
  const { error: e2 } = await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Alerts cleanup:', e2 ? e2.message : 'OK');
  
  console.log('Database cleaned! Ready for fresh simulations.');
}

clean(); 
