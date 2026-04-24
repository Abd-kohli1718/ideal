/**
 * Upload curated disaster images from CrisisMMD to Supabase Storage
 * so the simulate controller can use REAL disaster images.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DATA_ROOT = path.join(__dirname, 'ml', 'data', 'CrisisMMD_v2.0', 'data_image');

// Pick 2 images from each disaster category
const PICKS = [
  { category: 'california_wildfires', subdir: '10_10_2017', label: 'wildfire' },
  { category: 'california_wildfires', subdir: '12_10_2017', label: 'wildfire' },
  { category: 'hurricane_harvey', label: 'hurricane' },
  { category: 'hurricane_irma', label: 'hurricane' },
  { category: 'srilanka_floods', label: 'flood' },
  { category: 'iraq_iran_earthquake', label: 'earthquake' },
  { category: 'mexico_earthquake', label: 'earthquake' },
  { category: 'hurricane_maria', label: 'hurricane' },
];

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === 'media');
  if (!exists) {
    const { error } = await supabase.storage.createBucket('media', { public: true });
    if (error) console.log('Bucket create error:', error.message);
    else console.log('Created media bucket');
  } else {
    console.log('Media bucket already exists');
  }
}

async function findRealImage(dir) {
  // Find images that are actual photos (>10KB, not macOS resource forks)
  const files = fs.readdirSync(dir).filter(f => {
    if (f.startsWith('._') || f.startsWith('.')) return false;
    if (!f.endsWith('.jpg') && !f.endsWith('.png') && !f.endsWith('.jpeg')) return false;
    const stat = fs.statSync(path.join(dir, f));
    return stat.size > 10000;
  });
  if (files.length === 0) return null;
  // Pick a random one
  return path.join(dir, files[Math.floor(Math.random() * files.length)]);
}

async function main() {
  await ensureBucket();
  
  const uploaded = [];

  for (const pick of PICKS) {
    let imgDir = path.join(DATA_ROOT, pick.category);
    
    // If subdirectory specified, use it; otherwise pick the first date subdir
    if (pick.subdir) {
      imgDir = path.join(imgDir, pick.subdir);
    } else {
      // Find first available subdir
      const subdirs = fs.readdirSync(imgDir).filter(f => {
        return fs.statSync(path.join(imgDir, f)).isDirectory() && !f.startsWith('.');
      });
      if (subdirs.length === 0) {
        console.log(`  No subdirs found in ${pick.category}, skipping`);
        continue;
      }
      imgDir = path.join(imgDir, subdirs[Math.floor(Math.random() * subdirs.length)]);
    }

    const imgPath = await findRealImage(imgDir);
    if (!imgPath) {
      console.log(`  No suitable image found in ${imgDir}`);
      continue;
    }

    const fileName = `disasters/${pick.label}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
    const fileData = fs.readFileSync(imgPath);

    console.log(`  Uploading ${path.basename(imgPath)} as ${fileName} (${(fileData.length / 1024).toFixed(0)}KB)...`);
    
    const { error } = await supabase.storage.from('media').upload(fileName, fileData, {
      contentType: 'image/jpeg',
      upsert: true,
    });

    if (error) {
      console.log(`  ERROR: ${error.message}`);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    uploaded.push({ label: pick.label, category: pick.category, url: publicUrl });
    console.log(`  OK: ${publicUrl}`);
  }

  console.log('\n=== UPLOADED DISASTER IMAGES ===');
  console.log(JSON.stringify(uploaded, null, 2));
  console.log(`\nTotal: ${uploaded.length} images uploaded.`);
}

main().catch(console.error);
