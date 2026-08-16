import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/projects', label: 'Projects' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/technologies', label: 'Technologies' },
  { to: '/admin/settings', label: 'Site settings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={styles.sidebar}>
        <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
          <span style={{ color: 'var(--signal)' }}>&#9670;</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Admin Panel</span>
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 10, wordBreak: 'break-all' }}>
            {user?.email}
          </div>
          <button className="btn btn--ghost" style={{ width: '100%' }} onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main style={styles.main}>
        <div className="container" style={{ maxWidth: 1080, padding: '36px 24px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const styles = {
  sidebar: {
    width: 240, flexShrink: 0, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)',
    padding: 24, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
  },
  navItem: { padding: '10px 12px', borderRadius: 6, fontSize: 14, color: 'var(--text-dim)' },
  navItemActive: { background: 'var(--signal-dim)', color: 'var(--signal)' },
  main: { flex: 1, minWidth: 0 },
};
