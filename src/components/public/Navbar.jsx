import { Link, NavLink } from 'react-router-dom';

export default function Navbar({ siteName, logoUrl }) {
  return (
    <header style={styles.header}>
      <div className="container" style={styles.inner}>
        <Link to="/" style={styles.brand}>
          {logoUrl ? (
            <img src={logoUrl} alt="" style={{ height: 28, width: 28, borderRadius: 6 }} />
          ) : (
            <span style={styles.mark}>&#9670;</span>
          )}
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>
            {siteName || 'IoT Showcase'}
          </span>
        </Link>
        <nav style={styles.nav}>
          <NavLink to="/" end style={({ isActive }) => ({ ...styles.link, color: isActive ? 'var(--signal)' : 'var(--text-dim)' })}>Projects</NavLink>
          <NavLink to="/about" style={({ isActive }) => ({ ...styles.link, color: isActive ? 'var(--signal)' : 'var(--text-dim)' })}>About</NavLink>
          <NavLink to="/contact" style={({ isActive }) => ({ ...styles.link, color: isActive ? 'var(--signal)' : 'var(--text-dim)' })}>Contact</NavLink>
        </nav>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: 'sticky', top: 0, zIndex: 100,
    height: 'var(--header-height)',
    background: 'rgba(10, 15, 26, 0.85)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid var(--border)',
  },
  inner: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  mark: { color: 'var(--signal)', fontSize: 16 },
  nav: { display: 'flex', gap: 28, fontSize: 14, color: 'var(--text-dim)' },
  link: { transition: 'color 0.15s' },
};
