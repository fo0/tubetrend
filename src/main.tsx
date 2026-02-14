import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/src/styles/index.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import App from '@/src/app/App';
import {ThemeProvider} from '@/src/providers';
import {ErrorBoundary} from '@/src/shared/components/feedback/ErrorBoundary';
import '@/src/i18n/config';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
