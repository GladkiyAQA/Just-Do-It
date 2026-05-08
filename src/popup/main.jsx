import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '../styles/index.css';

// Mark the document when rendered in Chrome's side panel so CSS can stretch
// to the full panel size instead of the fixed popup dimensions.
// Two checks because Chrome sometimes strips the query string from
// chrome-extension:// URLs in side panel context:
//   1) explicit `?panel=1` param
//   2) viewport height > 650 (popup is fixed at 600, side panel inherits the
//      whole browser window height)
function detectPanelMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('panel') === '1') return true;
  if (window.innerHeight > 650 || window.innerWidth > 400) return true;
  return false;
}
if (detectPanelMode()) {
  document.documentElement.classList.add('in-panel');
}
// Also re-check on resize — handles the edge case where the panel is opened
// before the browser has settled its dimensions.
window.addEventListener('resize', () => {
  if (detectPanelMode()) document.documentElement.classList.add('in-panel');
}, { passive: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
