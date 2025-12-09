import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IncidentCountProvider } from './contexts/IncidentCountContext';

export default function App() {
  try {
    console.log('App rendering, router:', router);
    return (
      <ErrorBoundary>
        <IncidentCountProvider>
          <RouterProvider router={router} />
        </IncidentCountProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('App error:', error);
    return (
      <div style={{ padding: '20px' }}>
        <h1>App Error</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
}