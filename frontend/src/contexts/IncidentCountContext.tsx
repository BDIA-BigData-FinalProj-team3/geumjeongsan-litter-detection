import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { getActiveEmergencies, getActiveFires, getActiveRockfalls, getActiveTrashIncidents } from '../services/api';

export interface NotificationItem {
  id: string;
  cctvId: string;
  location: string;
  time: string;
  confidence: string;
  timeAgo: string;
  timestamp: number;
  type: 'fire' | 'emergency' | 'trash';
}

interface IncidentCountContextType {
  emergencyCount: number;
  fireCount: number;
  trashCount: number;
  rockfallCount: number;
  setEmergencyCount: (count: number) => void;
  setFireCount: (count: number) => void;
  setTrashCount: (count: number) => void;
  setRockfallCount: (count: number) => void;
  completedIncidents: Set<string>;
  addCompletedIncident: (cctvId: string) => void;
  resetCompletedIncidents: () => void;
  allNotifications: NotificationItem[];
  setAllNotifications: (notifications: NotificationItem[]) => void;
}

const IncidentCountContext = createContext<IncidentCountContextType | undefined>(undefined);

export function IncidentCountProvider({ children }: { children: ReactNode }) {
  // ✅ 배지 숫자 = "진행중(DB) 사건 수"를 기준으로 유지 (더미 금지)
  const [emergencyCount, setEmergencyCount] = useState(0);
  const [fireCount, setFireCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [rockfallCount, setRockfallCount] = useState(0);
  const [completedIncidents, setCompletedIncidents] = useState<Set<string>>(new Set());
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);
  const refreshTimerRef = useRef<number | null>(null);

  const addCompletedIncident = (cctvId: string) => {
    setCompletedIncidents(prev => new Set(prev).add(cctvId));
  };

  const resetCompletedIncidents = () => {
    setCompletedIncidents(new Set());
    // reset은 "완료처리된 알림 필터"만 초기화. 카운트는 DB에서 다시 가져오게 둠.
  };

  // ✅ 앱 어디서 보든 배지 숫자가 "실제 DB 진행중 사건" 기준으로 유지되도록 주기적 리프레시
  useEffect(() => {
    let cancelled = false;

    const refreshFromDb = async () => {
      try {
        const [em, fire, trash, rock] = await Promise.all([
          getActiveEmergencies(),
          getActiveFires(),
          getActiveTrashIncidents(),
          getActiveRockfalls(),
        ]);
        if (cancelled) return;
        setEmergencyCount(Array.isArray(em) ? em.length : 0);
        setFireCount(Array.isArray(fire) ? fire.length : 0);
        setTrashCount(Array.isArray(trash) ? trash.length : 0);
        setRockfallCount(Array.isArray(rock) ? rock.length : 0);
      } catch {
        // 네트워크 오류 시 카운트 유지 (필요시 추후 토스트 처리)
      }
    };

    // 초기 1회 + 10초마다 갱신
    refreshFromDb();
    refreshTimerRef.current = window.setInterval(refreshFromDb, 10_000);

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    };
  }, []);

  return (
    <IncidentCountContext.Provider value={{ 
      emergencyCount, 
      fireCount, 
      trashCount, 
      rockfallCount,
      setEmergencyCount, 
      setFireCount, 
      setTrashCount,
      setRockfallCount,
      completedIncidents,
      addCompletedIncident,
      resetCompletedIncidents,
      allNotifications,
      setAllNotifications
    }}>
      {children}
    </IncidentCountContext.Provider>
  );
}

export function useIncidentCount() {
  const context = useContext(IncidentCountContext);
  if (context === undefined) {
    throw new Error('useIncidentCount must be used within an IncidentCountProvider');
  }
  return context;
}

