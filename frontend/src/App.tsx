import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IncidentCountProvider } from './contexts/IncidentCountContext';
import { AuthProvider } from './contexts/AuthContext';
import { RealtimeNotificationProvider } from './contexts/RealtimeNotificationContext';
import { useEffect } from 'react';

export default function App() {
  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  try {
    console.log('App rendering, router:', router);
    return (
      <ErrorBoundary>
        <AuthProvider>
          <RealtimeNotificationProvider>
            <IncidentCountProvider>
              <RouterProvider router={router} />
            </IncidentCountProvider>
          </RealtimeNotificationProvider>
        </AuthProvider>
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