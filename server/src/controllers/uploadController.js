'use strict';

/**
 * uploadController — POST /api/admin/upload
 *
 * Accepts a single multipart file upload, validates it, and stores it in
 * Supabase Storage via storageService.  Returns the public URL on success.
 *
 * Security layers:
 *   1. JWT authentication enforced upstream in app.js (authenticate middleware)
 *   2. multer memory-storage with hard 10 MB limit (catches oversized requests early)
 *   3. MIME type whitelist checked against both multer header AND magic bytes
 *   4. Per-type size caps (images ≤ 5 MB, audio ≤ 10 MB)
 *   5. Filename sanitised in storageService before the storage path is constructed
 */

const multer = require('multer');
const { uploadFile } = require('../services/storageService');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Config — allowed types, size limits, folder routing
// ---------------------------------------------------------------------------

const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/ogg',
  'audio/mp4',
]);

// Maximum byte sizes per category
const SIZE_LIMITS = {
  image: 5 * 1024 * 1024,  // 5 MB
  audio: 10 * 1024 * 1024, // 10 MB
};

// Extension → MIME type map for cross-checking
const EXT_TO_MIME = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  mp3:  'audio/mpeg',
  ogg:  'audio/ogg',
  m4a:  'audio/mp4',
  mp4:  'audio/mp4',
};

// Magic byte signatures for supported types
// Each entry: { mime, offset, bytes }
const MAGIC_SIGNATURES = [
  // JPEG: FF D8 FF
  { mime: 'image/jpeg',  offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  // PNG:  89 50 4E 47 0D 0A 1A 0A
  { mime: 'image/png',   offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] },
  // WebP: RIFF....WEBP
  { mime: 'image/webp',  offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF — further check at offset 8
  // MP3:  ID3 tag or sync word FF FB / FF F3 / FF F2
  { mime: 'audio/mpeg',  offset: 0, bytes: [0x49, 0x44, 0x33] },        // ID3
  { mime: 'audio/mpeg',  offset: 0, bytes: [0xFF, 0xFB] },
  { mime: 'audio/mpeg',  offset: 0, bytes: [0xFF, 0xF3] },
  { mime: 'audio/mpeg',  offset: 0, bytes: [0xFF, 0xF2] },
  // OGG:  OggS
  { mime: 'audio/ogg',   offset: 0, bytes: [0x4F, 0x67, 0x67, 0x53] },
  // MP4/M4A: ftyp box at offset 4
  { mime: 'audio/mp4',   offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // ftyp
];

/**
 * Check buffer magic bytes against known signatures.
 * Returns the MIME type that matches, or null if no match.
 *
 * @param {Buffer} buf
 * @returns {string|null}
 */
function detectMimeFromBytes(buf) {
  for (const sig of MAGIC_SIGNATURES) {
    const slice = buf.slice(sig.offset, sig.offset + sig.bytes.length);
    if (slice.length < sig.bytes.length) continue;
    if (sig.bytes.every((b, i) => slice[i] === b)) {
      // Extra check for WebP: bytes 8–11 must be "WEBP"
      if (sig.mime === 'image/webp') {
        const webpTag = buf.slice(8, 12).toString('ascii');
        if (webpTag !== 'WEBP') continue;
      }
      return sig.mime;
    }
  }
  return null;
}

/**
 * Derive the category ('image' or 'audio') from a MIME type.
 * Returns null for unrecognised types.
 *
 * @param {string} mime
 * @returns {'image'|'audio'|null}
 */
function categoryFromMime(mime) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  return null;
}

// ---------------------------------------------------------------------------
// multer — memory storage, 10 MB hard ceiling
// ---------------------------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: SIZE_LIMITS.audio, // Hard ceiling; per-type checks follow below
    files: 1,
  },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error(
        `Unsupported file type: ${file.mimetype}. Allowed: ${[...ALLOWED_MIMETYPES].join(', ')}`
      );
      err.status = 400;
      cb(err);
    }
  },
}).single('file');

// Promisify multer so we can await it and handle its errors in one place
function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/upload
 *
 * Multipart body: field name "file"
 *
 * Success response 200:
 *   { url: string, filename: string, mimetype: string, size: number }
 *
 * Error responses:
 *   400 — validation failure (wrong type, too large, magic byte mismatch)
 *   500 — storage failure
 */
async function handleUpload(req, res) {
  // 1. Parse multipart form (multer handles size + MIME header filter)
  try {
    await runMulter(req, res);
  } catch (multerErr) {
    const status = multerErr.code === 'LIMIT_FILE_SIZE' ? 400 : (multerErr.status || 400);
    const message = multerErr.code === 'LIMIT_FILE_SIZE'
      ? `File too large. Maximum size is ${SIZE_LIMITS.audio / (1024 * 1024)} MB.`
      : multerErr.message;
    return res.status(status).json({ error: message });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided. Include a "file" field in the multipart form.' });
  }

  const { buffer, mimetype, originalname, size } = req.file;

  // 2. Cross-check MIME header against actual magic bytes
  const detectedMime = detectMimeFromBytes(buffer);

  if (detectedMime === null) {
    logger.warn({
      message: 'uploadController: magic byte check failed',
      claimedMime: mimetype,
      originalname,
      size,
    });
    return res.status(400).json({
      error: 'File content does not match any supported file type. Ensure the file is a valid image or audio file.',
    });
  }

  // The detected MIME and the claimed MIME must agree on category (image vs audio)
  const claimedCategory = categoryFromMime(mimetype);
  const detectedCategory = categoryFromMime(detectedMime);

  if (claimedCategory !== detectedCategory) {
    logger.warn({
      message: 'uploadController: MIME category mismatch',
      claimed: mimetype,
      detected: detectedMime,
    });
    return res.status(400).json({
      error: `MIME type mismatch: header claims ${mimetype} but file bytes indicate ${detectedMime}.`,
    });
  }

  // 3. Validate extension matches declared MIME
  const ext = originalname.split('.').pop().toLowerCase();
  const expectedMime = EXT_TO_MIME[ext];

  if (expectedMime && categoryFromMime(expectedMime) !== claimedCategory) {
    return res.status(400).json({
      error: `File extension ".${ext}" does not match the declared MIME type "${mimetype}".`,
    });
  }

  // 4. Per-category size cap
  const category = claimedCategory;
  const sizeLimit = SIZE_LIMITS[category];

  if (size > sizeLimit) {
    return res.status(400).json({
      error: `${category === 'image' ? 'Image' : 'Audio'} files must be ≤ ${sizeLimit / (1024 * 1024)} MB. Received ${(size / (1024 * 1024)).toFixed(2)} MB.`,
    });
  }

  // 5. Upload to Supabase Storage
  const folder = category === 'audio' ? 'audio' : 'images';

  try {
    const url = await uploadFile(buffer, mimetype, originalname, folder);

    logger.info({
      message: 'uploadController: upload successful',
      userId: req.user?.userId,
      filename: originalname,
      url,
      size,
    });

    return res.status(200).json({
      url,
      filename: originalname,
      mimetype,
      size,
    });
  } catch (storageErr) {
    logger.error({
      message: 'uploadController: storage error',
      error: storageErr.message,
      filename: originalname,
    });
    return res.status(500).json({ error: 'Upload to storage failed. Please try again.' });
  }
}

module.exports = { handleUpload };
