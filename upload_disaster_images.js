/**
 * Upload exactly 20 curated disaster images from CrisisMMD to Supabase Storage
 * Then clean all old alerts from the database.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DATA_ROOT = path.join(__dirname, 'ml', 'data', 'CrisisMMD_v2.0', 'data_image');

// 20 picks across all 7 disaster categories
const PICKS = [
  // Wildfires (4)
  { category: 'california_wildfires', subdir: '10_10_2017', label: 'wildfire', id: 1 },
  { category: 'california_wildfires', subdir: '12_10_2017', label: 'wildfire', id: 2 },
  { category: 'california_wildfires', subdir: '15_10_2017', label: 'wildfire', id: 3 },
  { category: 'california_wildfires', subdir: '18_10_2017', label: 'wildfire', id: 4 },
  // Hurricane Harvey (3)
  { category: 'hurricane_harvey', label: 'hurricane_harvey', id: 5 },
  { category: 'hurricane_harvey', label: 'hurricane_harvey', id: 6 },
  { category: 'hurricane_harvey', label: 'hurricane_harvey', id: 7 },
  // Hurricane Irma (3)
  { category: 'hurricane_irma', label: 'hurricane_irma', id: 8 },
  { category: 'hurricane_irma', label: 'hurricane_irma', id: 9 },
  { category: 'hurricane_irma', label: 'hurricane_irma', id: 10 },
  // Hurricane Maria (2)
  { category: 'hurricane_maria', label: 'hurricane_maria', id: 11 },
  { category: 'hurricane_maria', label: 'hurricane_maria', id: 12 },
  // Iraq-Iran Earthquake (3)
  { category: 'iraq_iran_earthquake', label: 'earthquake', id: 13 },
  { category: 'iraq_iran_earthquake', label: 'earthquake', id: 14 },
  { category: 'iraq_iran_earthquake', label: 'earthquake', id: 15 },
  // Mexico Earthquake (3)
  { category: 'mexico_earthquake', label: 'earthquake_mexico', id: 16 },
  { category: 'mexico_earthquake', label: 'earthquake_mexico', id: 17 },
  { category: 'mexico_earthquake', label: 'earthquake_mexico', id: 18 },
  // Sri Lanka Floods (2)
  { category: 'srilanka_floods', label: 'flood', id: 19 },
  { category: 'srilanka_floods', label: 'flood', id: 20 },
];

// Track used files to avoid duplicates
const usedFiles = new Set();

function findRealImage(dir) {
  const files = fs.readdirSync(dir).filter(f => {
    if (f.startsWith('._') || f.startsWith('.')) return false;
    if (!f.endsWith('.jpg') && !f.endsWith('.png') && !f.endsWith('.jpeg')) return false;
    const full = path.join(dir, f);
    if (usedFiles.has(full)) return false;
    const stat = fs.statSync(full);
    return stat.size > 15000; // only real photos
  });
  if (files.length === 0) return null;
  const picked = path.join(dir, files[Math.floor(Math.random() * files.length)]);
  usedFiles.add(picked);
  return picked;
}

function findSubdir(categoryDir) {
  const subdirs = fs.readdirSync(categoryDir).filter(f => {
    return fs.statSync(path.join(categoryDir, f)).isDirectory() && !f.startsWith('.');
  });
  if (subdirs.length === 0) return null;
  return subdirs[Math.floor(Math.random() * subdirs.length)];
}

async function main() {
  // 1. Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === 'media');
  if (!exists) {
    await supabase.storage.createBucket('media', { public: true });
    console.log('Created media bucket');
  }

  // 2. Delete old disaster images from storage
  try {
    const { data: oldFiles } = await supabase.storage.from('media').list('disasters');
    if (oldFiles && oldFiles.length > 0) {
      const paths = oldFiles.map(f => `disasters/${f.name}`);
      await supabase.storage.from('media').remove(paths);
      console.log(`Deleted ${paths.length} old disaster images from storage`);
    }
  } catch (e) {
    console.log('Storage cleanup:', e.message);
  }

  // 3. Upload 20 images
  const uploaded = [];

  for (const pick of PICKS) {
    let imgDir = path.join(DATA_ROOT, pick.category);

    if (pick.subdir) {
      imgDir = path.join(imgDir, pick.subdir);
    } else {
      const sub = findSubdir(imgDir);
      if (!sub) { console.log(`  Skip ${pick.category}: no subdirs`); continue; }
      imgDir = path.join(imgDir, sub);
    }

    const imgPath = findRealImage(imgDir);
    if (!imgPath) { console.log(`  Skip ${pick.id}: no image in ${imgDir}`); continue; }

    const fileName = `disasters/${pick.label}_${String(pick.id).padStart(2,'0')}.jpg`;
    const fileData = fs.readFileSync(imgPath);

    console.log(`  [${pick.id}/20] Uploading ${path.basename(imgPath)} → ${fileName} (${(fileData.length/1024).toFixed(0)}KB)`);

    const { error } = await supabase.storage.from('media').upload(fileName, fileData, {
      contentType: 'image/jpeg',
      upsert: true,
    });

    if (error) { console.log(`  ERROR: ${error.message}`); continue; }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    uploaded.push({ id: pick.id, label: pick.label, url: publicUrl });
    console.log(`  OK → ${publicUrl}`);
  }

  // 4. Clean ALL old alerts from database
  console.log('\nCleaning old alerts from database...');
  const { error: delTriageErr } = await supabase.from('triage_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delTriageErr) console.log('Triage cleanup:', delTriageErr.message);
  
  const { error: delAlertErr } = await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delAlertErr) console.log('Alert cleanup:', delAlertErr.message);
  
  console.log('Database cleaned!');

  // 5. Print results
  console.log(`\n=== UPLOADED ${uploaded.length}/20 DISASTER IMAGES ===`);
  uploaded.forEach(u => console.log(`  ${u.id}. [${u.label}] ${u.url}`));

  // 6. Output for the controller
  console.log('\n// Copy this array into simulateController.js:');
  console.log('const DISASTER_IMAGES = ' + JSON.stringify(uploaded.map(u => u.url), null, 2) + ';');
}

main().catch(console.error);
