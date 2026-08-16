import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './routes/ProtectedRoute';
import { getSiteSettings } from './supabase/database';

import PublicLayout from './components/public/PublicLayout';
import Home from './pages/public/Home';
import ProjectDetail from './pages/public/ProjectDetail';
import About from './pages/public/About';
import Contact from './pages/public/Contact';

import AdminLayout from './components/admin/AdminLayout';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import ProjectList from './pages/admin/ProjectList';
import ProjectEditor from './pages/admin/ProjectEditor';
import Categories from './pages/admin/Categories';
import Technologies from './pages/admin/Technologies';
import SiteSettings from './pages/admin/SiteSettings';

export default function App() {
  const [settings, setSettings] = useState(null);

  useEffect(() => { getSiteSettings().then(setSettings).catch(() => {}); }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route element={<PublicLayout settings={settings} />}>
            <Route path="/" element={<Home />} />
            <Route path="/projects/:slug" element={<ProjectDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Route>

          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<ProjectList />} />
            <Route path="projects/:id" element={<ProjectEditor />} />
            <Route path="categories" element={<Categories />} />
            <Route path="technologies" element={<Technologies />} />
            <Route path="settings" element={<SiteSettings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
      <div className="mono" style={{ color: 'var(--text-faint)', marginBottom: 10 }}>404</div>
      <h1 style={{ fontSize: 28 }}>Signal lost — page not found.</h1>
    </div>
  );
}
