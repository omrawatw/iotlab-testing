import { useOutletContext } from 'react-router-dom';

export default function Contact() {
  const { settings } = useOutletContext();
  const social = settings?.social || {};
  return (
    <section className="container" style={{ padding: '56px 0', maxWidth: 560 }}>
      <div className="mono" style={{ fontSize: 12, color: 'var(--signal)', marginBottom: 14 }}>{'// contact'}</div>
      <h1 style={{ fontSize: 34, marginBottom: 24 }}>Get in touch</h1>
      <div className="panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {settings?.contactEmail && (
          <Row label="Email"><a href={`mailto:${settings.contactEmail}`} style={{ color: 'var(--signal)' }}>{settings.contactEmail}</a></Row>
        )}
        {settings?.contactPhone && <Row label="Phone">{settings.contactPhone}</Row>}
        {settings?.address && <Row label="Location">{settings.address}</Row>}
        {(social.github || social.linkedin || social.twitter || social.youtube) && (
          <Row label="Elsewhere">
            <div style={{ display: 'flex', gap: 14 }}>
              {social.github && <a href={social.github} target="_blank" rel="noreferrer" style={{ color: 'var(--signal)' }}>GitHub</a>}
              {social.linkedin && <a href={social.linkedin} target="_blank" rel="noreferrer" style={{ color: 'var(--signal)' }}>LinkedIn</a>}
              {social.twitter && <a href={social.twitter} target="_blank" rel="noreferrer" style={{ color: 'var(--signal)' }}>Twitter / X</a>}
              {social.youtube && <a href={social.youtube} target="_blank" rel="noreferrer" style={{ color: 'var(--signal)' }}>YouTube</a>}
            </div>
          </Row>
        )}
        {!settings && <p>Contact details will appear here once the admin fills them in under Site Settings.</p>}
      </div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 14.5 }}>{children}</div>
    </div>
  );
}
