import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Automatically clean tracking query parameters (e.g. utm_source from ChatGPT or external links)
if (typeof window !== 'undefined' && window.location.search) {
  const url = new URL(window.location.href);
  const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  let hasTracking = false;
  
  trackingParams.forEach((param) => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      hasTracking = true;
    }
  });

  if (hasTracking) {
    const cleanUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
    window.history.replaceState(null, '', cleanUrl);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
