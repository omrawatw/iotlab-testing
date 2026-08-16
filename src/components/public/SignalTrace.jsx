import { useEffect, useRef } from 'react';

/**
 * The page's signature element: a routed circuit trace that draws itself
 * on load and connects a few "nodes" (stats). It's built from the site's
 * own subject matter — PCB routing — rather than a generic gradient blob.
 */
export default function SignalTrace({ stats = [] }) {
  const pathRef = useRef(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
    // trigger animation via CSS class after layout
    requestAnimationFrame(() => {
      path.style.animation = 'trace-draw 1.6s ease forwards';
    });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox="0 0 1200 220" style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="none">
        <path
          ref={pathRef}
          d="M 40 180 L 40 120 L 220 120 L 260 80 L 480 80 L 520 40 L 760 40 L 800 90 L 980 90 L 1020 150 L 1160 150"
          fill="none"
          stroke="var(--signal)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.65"
        />
        {[
          [40, 180], [220, 120], [480, 80], [760, 40], [980, 90], [1160, 150],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="var(--signal)" style={{ animation: `node-glow 2.4s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </svg>
      {!!stats.length && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
          gap: 16,
          marginTop: -8,
        }}>
          {stats.map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 24, color: 'var(--text)', fontWeight: 600 }}>{s.value}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
