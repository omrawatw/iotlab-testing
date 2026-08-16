import { useOutletContext } from 'react-router-dom';

export default function About() {
  const { settings } = useOutletContext();
  return (
    <section className="container" style={{ padding: '56px 0', maxWidth: 720 }}>
      <div className="mono" style={{ fontSize: 12, color: 'var(--signal)', marginBottom: 14 }}>{'// about'}</div>
      <h1 style={{ fontSize: 34, marginBottom: 20 }}>About {settings?.siteName || 'this showcase'}</h1>
      <p style={{ fontSize: 15.5, marginBottom: 16 }}>
        {settings?.description ||
          'This site documents a set of embedded systems and IoT projects end to end — from schematic and bill of materials through firmware, enclosure, and field results.'}
      </p>
      <p style={{ fontSize: 15.5 }}>
        Every project page includes the full write-up, hardware and software breakdown, circuit and architecture
        diagrams, demo footage, and the actual source files — so a build can be reproduced, not just admired.
      </p>
    </section>
  );
}
