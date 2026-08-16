import { CLOUD_NAME, UPLOAD_PRESET } from './config';
import { supabase } from '../supabase/config';

/*
  File storage runs on Cloudinary (unsigned browser uploads, no card
  required); "the database" runs on Supabase Postgres — see
  src/supabase/database.js. Deleting a Cloudinary asset requires a
  *signed* request (API key + secret), which must never live in browser
  code, so deleteFile() calls the delete-cloudinary-asset Supabase Edge
  Function (supabase/functions/delete-cloudinary-asset), which holds those
  credentials as Edge Function secrets and checks the caller is a
  signed-in admin (via the same is_admin() the database RLS policies use)
  before deleting anything.

  The `path` field returned by uploadFile is `${resourceType}/${publicId}`
  — resourceType (image | video | raw) is folded in because Cloudinary's
  delete API needs it; every table that stores a `path` column just treats
  it as an opaque string.
*/

const LIMITS = {
  image: { maxBytes: 8 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  document: { maxBytes: 25 * 1024 * 1024, types: ['application/pdf'] },
  archive: {
    maxBytes: 200 * 1024 * 1024,
    types: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  },
  presentation: {
    maxBytes: 50 * 1024 * 1024,
    types: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ],
  },
  video: { maxBytes: 200 * 1024 * 1024, types: ['video/mp4', 'video/webm'] },
};

export function validateFile(file, kind) {
  const rule = LIMITS[kind];
  if (!rule) throw new Error(`Unknown upload kind: ${kind}`);
  if (file.size > rule.maxBytes) {
    throw new Error(`File exceeds the ${Math.round(rule.maxBytes / 1024 / 1024)}MB limit for ${kind} uploads.`);
  }
  if (!rule.types.includes(file.type)) {
    throw new Error(`"${file.type || 'unknown type'}" is not an allowed file type for ${kind} uploads.`);
  }
  return true;
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function resourceTypeFor(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'raw'; // pdf, zip, pptx, docx, etc.
}

/**
 * Uploads a file to Cloudinary with progress reporting.
 * `folder` mirrors the old Firebase Storage path, e.g. `projects/{id}/gallery`.
 * onProgress(percent: 0-100) is called throughout the upload.
 * Returns { url, path, size, contentType, name }.
 */
export function uploadFile(folder, file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(new Error(
        'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env.'
      ));
      return;
    }

    const resourceType = resourceTypeFor(file);
    const baseName = sanitizeFilename(file.name.replace(/\.[^./]+$/, ''));
    const publicId = `${folder}/${Date.now()}_${baseName}`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('public_id', publicId);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url: data.secure_url,
          path: `${resourceType}/${data.public_id}`,
          size: data.bytes,
          contentType: file.type,
          name: file.name,
        });
      } else {
        let message = `Upload failed (${xhr.status}).`;
        try { message = JSON.parse(xhr.responseText)?.error?.message || message; } catch { /* ignore */ }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(formData);
  });
}

export async function deleteFile(path) {
  if (!path) return;
  const slash = path.indexOf('/');
  const resourceType = path.slice(0, slash);
  const publicId = path.slice(slash + 1);

  const { error } = await supabase.functions.invoke('delete-cloudinary-asset', {
    body: { publicId, resourceType },
  });
  // A missing/already-deleted asset shouldn't block whatever admin action
  // triggered this. Anything else is a real failure — surface it.
  if (error && !`${error.message}`.includes('not found')) throw error;
}
