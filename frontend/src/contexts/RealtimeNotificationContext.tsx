import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import BACKEND_URL from '../config/api';

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
  refreshKey: number; // 전 화면 refetch 트리거
  addNotification: (notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextType | undefined>(undefined);

export const RealtimeNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ✅ 수신자 캐시(유형별): SSE 폭주 시에도 과도한 API 호출 방지
  const recipientsCacheRef = useRef<Map<string, { text: string; fetchedAt: number }>>(new Map());
  const RECIPIENTS_TTL_MS = 5 * 60 * 1000; // 5분

  // 너무 잦은 refetch 방지: refreshKey를 쿨다운으로 배치 처리
  const refreshCooldownMs = 50; // 50ms (거의 즉시, 체감 불가)
  const lastRefreshAtRef = useRef(0);
  const refreshTimerRef = useRef<number | null>(null);

  const scheduleRefresh = () => {
    const now = Date.now();
    const nextAllowed = lastRefreshAtRef.current + refreshCooldownMs;

    // 이미 타이머가 있으면 그대로 둠(추가 이벤트는 "묶임")
    if (refreshTimerRef.current != null) return;

    const delay = Math.max(0, nextAllowed - now);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      lastRefreshAtRef.current = Date.now();
      setRefreshKey((k) => k + 1);
    }, delay);
  };

  const playBeep = (kind: RealtimeNotification['type']) => {
    try {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq =
        kind === 'fire' ? 880 :
        kind === 'emergency' ? 740 :
        kind === 'trash' ? 520 : 660;

      osc.type = 'sine';
      osc.frequency.value = freq;

      // 짧고 확실하게: 0.12s, 부드러운 페이드 인/아웃
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);

      osc.onended = () => {
        try { ctx.close(); } catch {}
      };
    } catch {
      // 오디오 실패는 무시 (브라우저 정책/권한 등)
    }
  };

  const fetchRecipientsText = async (incidentTypeCode: string): Promise<string> => {
    const key = String(incidentTypeCode || '').toUpperCase().trim();
    if (!key) {
      console.log('📢 [Recipients] Empty incidentTypeCode');
      return '';
    }

    const cached = recipientsCacheRef.current.get(key);
    if (cached && Date.now() - cached.fetchedAt < RECIPIENTS_TTL_MS) {
      console.log('📢 [Recipients] Using cached:', key, cached.text);
      return cached.text;
    }

    try {
      const url = `${BACKEND_URL}/api/notifications/recipients/incident/${encodeURIComponent(key)}`;
      console.log('📢 [Recipients] Fetching:', url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch recipients (${res.status})`);
      const list = await res.json();
      console.log('📢 [Recipients] Response:', list);

      const arr = Array.isArray(list) ? list : [];
      const enabled = arr.filter((r: any) => r?.isEnabled !== false);
      console.log('📢 [Recipients] Enabled count:', enabled.length);
      
      const labels = enabled
        .map((r: any) => {
          const org = String(r?.organization || '').trim();
          const dept = String(r?.department || '').trim();
          const name = String(r?.name || '').trim();
          const pos = String(r?.position || '').trim();
          const parts = [org, dept, name, pos].filter(Boolean);
          return parts.join(' ');
        })
        .filter(Boolean);

      const max = 3;
      const head = labels.slice(0, max);
      const rest = labels.length - head.length;
      const text =
        labels.length === 0
          ? ''
          : `${head.join(', ')}${rest > 0 ? ` 외 ${rest}명` : ''}`;

      console.log('📢 [Recipients] Final text:', text);
      recipientsCacheRef.current.set(key, { text, fetchedAt: Date.now() });
      return text;
    } catch (e) {
      // 수신자 조회 실패는 토스트 표시를 막지 않음
      console.warn('⚠️ [Notification] Failed to load recipients for toast:', incidentTypeCode, e);
      recipientsCacheRef.current.set(key, { text: '', fetchedAt: Date.now() });
      return '';
    }
  };

  const toastIncident = (n: {
    type: RealtimeNotification['type'];
    title: string;
    message: string;
    recipientsText?: string;
  }) => {
    // ✅ 타입별 색상 필요 없다고 해서 단일 스타일로 통일
    toast(n.title, {
      description: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>{n.message}</div>
          {n.recipientsText ? (
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              알람 발송 완료: {n.recipientsText}
            </div>
          ) : null}
        </div>
      ),
    });
  };

  // ✅ SSE로 실시간 사건 이벤트 구독
  useEffect(() => {
    const url = `${BACKEND_URL}/api/realtime/stream`;
    const es = new EventSource(url, { withCredentials: true } as any);
    eventSourceRef.current = es;

    const onIncident = (e: MessageEvent) => {
      // 이벤트 폭주 시에도 화면 재조회는 쿨다운으로 묶어서 1번만
      scheduleRefresh();
      void (async () => {
        try {
          const payload = JSON.parse(e.data);
          const incidentTypeCode = String(payload?.incidentType ?? '').toUpperCase().trim();
          const mappedType: RealtimeNotification['type'] =
            incidentTypeCode === 'FIRE' ? 'fire' :
            incidentTypeCode === 'EMERGENCY' ? 'emergency' :
            incidentTypeCode === 'TRASH' ? 'trash' : 'system';

          const title =
            mappedType === 'trash' ? '쓰레기 사건 발생' :
            mappedType === 'fire' ? '화재 발생' :
            mappedType === 'emergency' ? '응급 상황 발생' : '사건 변경';

          const message = `${payload?.incidentCode ?? '사건'} (${payload?.status ?? ''})`;
          const recipientsText = await fetchRecipientsText(incidentTypeCode);

          console.log('📢 [Notification] incidentTypeCode:', incidentTypeCode, 'recipientsText:', recipientsText);

          // 체감: 토스트 + 비프
          toastIncident({ type: mappedType, title, message, recipientsText });
          playBeep(mappedType);

          addNotification({
            type: mappedType,
            title,
            message,
            incidentId: typeof payload?.incidentId === 'number' ? payload.incidentId : undefined,
            // ✅ 화면 표시는 항상 cctvCode 우선. (없으면 임시로 DB-ID를 표시)
            cctvId:
              (typeof payload?.cctvCode === 'string' && payload.cctvCode.trim() ? payload.cctvCode.trim() :
              (payload?.cctvId != null ? `CCTV(DB-${String(payload.cctvId)})` : undefined)),
            location: payload?.locationDesc ?? undefined,
          });
        } catch {
          // ignore parse error
        }
      })();
    };

    es.addEventListener('incident.created', onIncident);
    es.addEventListener('incident.updated', onIncident);

    es.onerror = () => {
      // SSE 끊기면 브라우저가 자동 재연결을 시도함.
      // 여기서는 별도 처리 없이 둠.
    };

    return () => {
      try { es.close(); } catch {}
      eventSourceRef.current = null;
      if (refreshTimerRef.current != null) {
        try { window.clearTimeout(refreshTimerRef.current); } catch {}
        refreshTimerRef.current = null;
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

    // 사운드/토스트는 SSE 수신 시점에서 처리 (여기서는 저장만)
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
        refreshKey,
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



