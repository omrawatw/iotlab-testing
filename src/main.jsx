import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/tokens.css';
import './styles/animations.css';
import './styles/components.css';

// HashRouter (URLs like /#/projects/slug) instead of BrowserRouter —
// GitHub Pages (and most plain static hosts) can't rewrite arbitrary
// paths back to index.html, so a direct load or refresh on a route like
// /projects/slug would 404 with BrowserRouter. Hash-based routes never
// leave index.html in the first place, so every route works on direct
// load/refresh with zero server configuration, on any static host.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
