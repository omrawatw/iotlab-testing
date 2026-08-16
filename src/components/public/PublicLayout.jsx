import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function PublicLayout({ settings }) {
  return (
    <>
      <Navbar siteName={settings?.siteName} logoUrl={settings?.logoUrl} />
      <div style={{ minHeight: '70vh' }}>
        <Outlet context={{ settings }} />
      </div>
      <div className="container"><Footer settings={settings} /></div>
    </>
  );
}
