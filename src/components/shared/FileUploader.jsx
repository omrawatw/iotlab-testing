import { useRef, useState } from 'react';
import { uploadFile, validateFile } from '../../cloudinary/storage';
import { useToast } from '../../context/ToastContext';

/**
 * Generic uploader for a single file. `kind` selects the validation rule
 * (image | document | archive | presentation | video, see storage.js).
 * `storagePath` is the folder the file lands in, e.g. `projects/{id}/gallery`.
 * Calls onUploaded({url, path, size, contentType, name}) when done.
 */
export default function FileUploader({ kind, storagePath, label, onUploaded, accept }) {
  const [progress, setProgress] = useState(null);
  const inputRef = useRef(null);
  const toast = useToast();

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      validateFile(file, kind);
    } catch (err) {
      toast.error(err.message);
      e.target.value = '';
      return;
    }
    setProgress(0);
    try {
      const result = await uploadFile(storagePath, file, setProgress);
      onUploaded(result);
      toast.success(`Uploaded ${file.name}`);
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <label className="btn" style={{ display: 'inline-flex' }}>
        {progress === null ? (label || 'Upload file') : `Uploading… ${progress}%`}
        <input ref={inputRef} type="file" accept={accept} onChange={handleChange} style={{ display: 'none' }} disabled={progress !== null} />
      </label>
      {progress !== null && (
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--signal)', transition: 'width 0.15s' }} />
        </div>
      )}
    </div>
  );
}
