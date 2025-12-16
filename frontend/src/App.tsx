import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IncidentCountProvider } from './contexts/IncidentCountContext';
import { AuthProvider } from './contexts/AuthContext';
import { RealtimeNotificationProvider } from './contexts/RealtimeNotificationContext';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

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
              {/* 전역 토스트 출력기 */}
              <Toaster
                position="top-right"
                richColors
                closeButton
                duration={3500}
              />
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