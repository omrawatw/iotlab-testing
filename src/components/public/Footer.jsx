export default function Footer({ settings }) {
  const socials = settings?.social || {};
  return (
    <footer style={styles.footer}>
      <div className="container" style={styles.inner}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 6 }}>
            {settings?.siteName || 'IoT Showcase'}
          </div>
          <p style={{ maxWidth: 340, fontSize: 13.5 }}>
            {settings?.description || 'A running log of embedded systems and connected-device builds.'}
          </p>
        </div>
        <div style={styles.col}>
          <div className="mono" style={styles.colHead}>CONTACT</div>
          {settings?.contactEmail && <a href={`mailto:${settings.contactEmail}`} style={styles.item}>{settings.contactEmail}</a>}
          {settings?.contactPhone && <span style={styles.item}>{settings.contactPhone}</span>}
        </div>
        <div style={styles.col}>
          <div className="mono" style={styles.colHead}>ELSEWHERE</div>
          {socials.github && <a href={socials.github} target="_blank" rel="noreferrer" style={styles.item}>GitHub</a>}
          {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noreferrer" style={styles.item}>LinkedIn</a>}
          {socials.twitter && <a href={socials.twitter} target="_blank" rel="noreferrer" style={styles.item}>Twitter / X</a>}
          {socials.youtube && <a href={socials.youtube} target="_blank" rel="noreferrer" style={styles.item}>YouTube</a>}
        </div>
      </div>
      <div className="container mono" style={styles.bottom}>
        © {new Date().getFullYear()} {settings?.siteName || 'IoT Showcase'} · built for engineers who ship hardware
      </div>
    </footer>
  );
}

const styles = {
  footer: { borderTop: '1px solid var(--border)', marginTop: 80, paddingTop: 48 },
  inner: { display: 'flex', flexWrap: 'wrap', gap: 48, justifyContent: 'space-between', paddingBottom: 32 },
  col: { display: 'flex', flexDirection: 'column', gap: 8 },
  colHead: { fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-faint)', marginBottom: 4 },
  item: { fontSize: 13.5, color: 'var(--text-dim)' },
  bottom: { borderTop: '1px solid var(--border)', padding: '16px 24px', fontSize: 12, color: 'var(--text-faint)' },
};
