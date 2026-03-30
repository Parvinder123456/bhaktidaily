'use strict';

/**
 * storageService — Supabase Storage wrapper for admin media uploads.
 *
 * Environment variables required:
 *   SUPABASE_URL         — e.g. https://lvavrkpifrrimtbbvbye.supabase.co
 *   SUPABASE_SERVICE_KEY — service-role key (never the anon key — write access needed)
 *
 * Bucket: "media"
 *   - Created with public read access
 *   - Only the service-role key can write (RLS enforced server-side)
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const BUCKET = 'media';

// ---------------------------------------------------------------------------
// Singleton Supabase client — lazy-initialised so missing env vars surface
// at call time with a clear error rather than at startup.
// ---------------------------------------------------------------------------
let _supabase = null;

function getClient() {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      'storageService: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars must be set'
    );
  }

  _supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _supabase;
}

// ---------------------------------------------------------------------------
// Filename sanitisation
// ---------------------------------------------------------------------------

/**
 * Strip path traversal sequences and retain only safe characters.
 * Allowed: alphanumeric, hyphen, underscore, dot.
 * Collapses repeated dots (prevents hidden-file tricks like "../../etc/passwd").
 *
 * @param {string} name - Original filename from the upload
 * @returns {string} Sanitised filename
 */
function sanitizeFilename(name) {
  // Take only the basename — no directory components
  const base = name.replace(/[/\\]/g, '_');
  // Keep alphanumeric, hyphen, underscore, dot; replace everything else
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Collapse consecutive dots to a single dot to prevent tricks like "..ext"
  return safe.replace(/\.{2,}/g, '.');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a file buffer to Supabase Storage.
 *
 * @param {Buffer}  buffer       - Raw file bytes
 * @param {string}  mimetype     - MIME type, e.g. "image/jpeg"
 * @param {string}  originalName - Original filename from the client
 * @param {string}  folder       - Destination folder inside the bucket, e.g. "images" or "audio"
 * @returns {Promise<string>}    Public URL of the uploaded file
 */
async function uploadFile(buffer, mimetype, originalName, folder) {
  const supabase = getClient();

  const safeName = sanitizeFilename(originalName);
  const storagePath = `${folder}/${Date.now()}-${safeName}`;

  logger.info({
    message: 'storageService: uploading file',
    storagePath,
    mimetype,
    size: buffer.length,
  });

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimetype,
      upsert: false, // Reject collisions — timestamp prefix makes them extremely unlikely
    });

  if (error) {
    logger.error({ message: 'storageService: upload failed', error: error.message, storagePath });
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Build the public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  if (!urlData?.publicUrl) {
    throw new Error('storageService: could not construct public URL after upload');
  }

  logger.info({ message: 'storageService: upload complete', url: urlData.publicUrl });

  return urlData.publicUrl;
}

module.exports = { uploadFile, sanitizeFilename };
