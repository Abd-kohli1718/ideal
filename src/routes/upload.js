const express = require('express');
const multer = require('multer');
const { getServiceClient } = require('../services/supabase');

const router = express.Router();

// Store in memory, max 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * POST /api/upload
 * Upload a file (image, video, audio) to Supabase storage.
 * Returns the public URL.
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const supabase = getServiceClient();
    const ext = req.file.originalname?.split('.').pop() || 'bin';
    const folder = req.file.mimetype?.startsWith('video') ? 'videos'
      : req.file.mimetype?.startsWith('audio') ? 'audio'
      : 'uploads';
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;

    const { error } = await supabase.storage
      .from('media')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return res.status(500).json({ success: false, error: 'Upload failed: ' + error.message });
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filename);

    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Upload route error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
