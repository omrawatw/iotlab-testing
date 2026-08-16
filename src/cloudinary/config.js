// Read from your Cloudinary dashboard (cloudinary.com/console) and an
// unsigned upload preset you create there — see README.md "File storage:
// Cloudinary" for the exact steps. Both values are safe to expose in the
// browser bundle; unsigned presets are designed for client-side uploads
// and can be scoped (folder, file size, allowed formats) from the
// Cloudinary dashboard so they can't be abused.
export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
export const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
