import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { registerSW } from 'virtual:pwa-register';

// Mount React application immediately with ErrorBoundary to guarantee rendering
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

// Safely register PWA Service Worker in the background without blocking render
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    // Only register if not inside an iframe (like AI Studio preview)
    const isInsideIframe = window.self !== window.top;
    if (!isInsideIframe) {
      registerSW({
        immediate: false,
        onNeedRefresh() {
          console.info('[PWA] New version available');
        },
        onOfflineReady() {
          console.info('[PWA] NexaHR is cached and ready offline');
        },
      });
    }
  } catch (err) {
    console.warn('[PWA] Service worker registration deferred:', err);
  }
}
