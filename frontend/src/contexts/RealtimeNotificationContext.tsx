import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// 알림 타입 정의
export interface RealtimeNotification {
  id: string;
  type: 'fire' | 'emergency' | 'trash' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  cctvId?: string;
  location?: string;
  confidence?: string;
  incidentId?: number;
}

interface RealtimeNotificationContextType {
  notifications: RealtimeNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextType | undefined>(undefined);

export const RealtimeNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 폴링 방식으로 새로운 사건 확인 (실제로는 WebSocket 사용 권장)
  useEffect(() => {
    const checkNewIncidents = async () => {
      try {
        // TODO: 실제 API 호출로 교체
        // const response = await fetch('/api/incidents/recent?since=' + lastCheckTime);
        // const newIncidents = await response.json();
        
        // 임시 데모용 - 랜덤하게 새 알림 생성 (10% 확률)
        if (Math.random() < 0.1) {
          const types: ('fire' | 'emergency' | 'trash')[] = ['fire', 'emergency', 'trash'];
          const randomType = types[Math.floor(Math.random() * types.length)];
          const cctvIds = ['CCTV-001', 'CCTV-002', 'CCTV-003', 'CCTV-004', 'CCTV-005'];
          const randomCCTV = cctvIds[Math.floor(Math.random() * cctvIds.length)];
          
          addNotification({
            type: randomType,
            title: randomType === 'fire' ? '화재 발생' : randomType === 'emergency' ? '응급 상황 발생' : '쓰레기 투기 발생',
            message: `${randomCCTV}에서 ${randomType === 'fire' ? '화재가' : randomType === 'emergency' ? '응급 상황이' : '쓰레기 투기가'} 감지되었습니다.`,
            cctvId: randomCCTV,
            location: '금정산 등산로',
            confidence: `${Math.floor(Math.random() * 30 + 70)}%`,
          });
        }
      } catch (error) {
        console.error('Failed to check new incidents:', error);
      }
    };

    // 5초마다 폴링
    pollingIntervalRef.current = setInterval(checkNewIncidents, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const addNotification = (notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);

    // 브라우저 알림 (권한이 있는 경우)
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: newNotification.id,
      });
    }

    // 사운드 재생 (선택사항)
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.play().catch(() => {
        // 오디오 재생 실패는 무시
      });
    } catch (error) {
      // 오디오 재생 실패는 무시
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <RealtimeNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </RealtimeNotificationContext.Provider>
  );
};

export const useRealtimeNotification = () => {
  const context = useContext(RealtimeNotificationContext);
  if (context === undefined) {
    throw new Error('useRealtimeNotification must be used within a RealtimeNotificationProvider');
  }
  return context;
};



