require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function cleanUp() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // 1. Delete alerts that contain picsum.photos to remove the old random images
  const { data, error } = await supabase
    .from('alerts')
    .delete()
    .like('message', '%picsum.photos%');
    
  console.log('Deleted old image alerts:', error || 'Success');

  // 2. Just to be safe, delete any other old demo alerts that might have 'picsum'
  const { data: d2, error: e2 } = await supabase
    .from('alerts')
    .delete()
    .like('message', '%MEDIA:%');

  console.log('Deleted other media alerts:', e2 || 'Success');
}
cleanUp();
