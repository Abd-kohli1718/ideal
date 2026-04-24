require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: users, error: err1 } = await supabase.from('users').select('*').limit(1);
  console.log('Users check:', users, err1);

  // Try upserting a fake user
  const { data, error } = await supabase.from('users').upsert({
    id: '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com',
    full_name: 'Test',
    role: 'citizen'
  }, { onConflict: 'id' });
  
  console.log('Upsert check:', error);
}
test();
