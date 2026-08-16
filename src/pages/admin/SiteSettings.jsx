import { useEffect, useState } from 'react';
import { getSiteSettings, updateSiteSettings } from '../../supabase/database';
import { uploadFile, validateFile, deleteFile } from '../../cloudinary/storage';
import { Spinner } from '../../components/shared/States';
import { useToast } from '../../context/ToastContext';

const EMPTY = {
  siteName: '', description: '', logoUrl: '', logoPath: '',
  contactEmail: '', contactPhone: '', address: '',
  social: { github: '', linkedin: '', twitter: '', youtube: '' },
};

export default function SiteSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoProgress, setLogoProgress] = useState(null);
  const toast = useToast();

  useEffect(() => {
    getSiteSettings().then((s) => setSettings(s ? { ...EMPTY, ...s, social: { ...EMPTY.social, ...s.social } } : EMPTY));
  }, []);

  if (!settings) return <Spinner />;

  function set(key, value) { setSettings((s) => ({ ...s, [key]: value })); }
  function setSocial(key, value) { setSettings((s) => ({ ...s, social: { ...s.social, [key]: value } })); }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { validateFile(file, 'image'); } catch (err) { toast.error(err.message); return; }
    setLogoProgress(0);
    try {
      if (settings.logoPath) {
        try {
          await deleteFile(settings.logoPath);
        } catch (err) {
          toast.error(`Old logo may still exist in Cloudinary: ${err.message}`);
        }
      }
      const result = await uploadFile('site/logo', file, setLogoProgress);
      setSettings((s) => ({ ...s, logoUrl: result.url, logoPath: result.path }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLogoProgress(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await updateSiteSettings(settings);
      toast.success('Site settings updated — changes are live immediately.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Site settings</h1>
      <p style={{ marginBottom: 24 }}>Controls the public site's branding, footer, and contact page.</p>

      <div className="panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>
        <Field label="Site name"><input className="input" value={settings.siteName} onChange={(e) => set('siteName', e.target.value)} /></Field>
        <Field label="Tagline / description"><textarea className="textarea" rows={3} value={settings.description} onChange={(e) => set('description', e.target.value)} /></Field>

        <Field label="Logo">
          {settings.logoUrl && <img src={settings.logoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 10 }} />}
          <label className="btn" style={{ display: 'inline-flex' }}>
            {logoProgress === null ? 'Upload logo' : `Uploading… ${logoProgress}%`}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} disabled={logoProgress !== null} />
          </label>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Field label="Contact email"><input className="input" type="email" value={settings.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></Field>
          <Field label="Contact phone"><input className="input" value={settings.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></Field>
        </div>
        <Field label="Address / location"><input className="input" value={settings.address} onChange={(e) => set('address', e.target.value)} /></Field>

        <div>
          <label className="field-label">Social links</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input className="input" placeholder="GitHub URL" value={settings.social.github} onChange={(e) => setSocial('github', e.target.value)} />
            <input className="input" placeholder="LinkedIn URL" value={settings.social.linkedin} onChange={(e) => setSocial('linkedin', e.target.value)} />
            <input className="input" placeholder="Twitter / X URL" value={settings.social.twitter} onChange={(e) => setSocial('twitter', e.target.value)} />
            <input className="input" placeholder="YouTube URL" value={settings.social.youtube} onChange={(e) => setSocial('youtube', e.target.value)} />
          </div>
        </div>

        <button className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="field-label">{label}</label>{children}</div>;
}
