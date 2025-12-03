import { createContext, useContext, useState, ReactNode } from 'react';

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
  setEmergencyCount: (count: number) => void;
  setFireCount: (count: number) => void;
  setTrashCount: (count: number) => void;
  completedIncidents: Set<string>;
  addCompletedIncident: (cctvId: string) => void;
  resetCompletedIncidents: () => void;
  allNotifications: NotificationItem[];
  setAllNotifications: (notifications: NotificationItem[]) => void;
}

const IncidentCountContext = createContext<IncidentCountContextType | undefined>(undefined);

export function IncidentCountProvider({ children }: { children: ReactNode }) {
  const [emergencyCount, setEmergencyCount] = useState(1);
  const [fireCount, setFireCount] = useState(2);
  const [trashCount, setTrashCount] = useState(7);
  const [completedIncidents, setCompletedIncidents] = useState<Set<string>>(new Set());
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);

  const addCompletedIncident = (cctvId: string) => {
    setCompletedIncidents(prev => new Set(prev).add(cctvId));
  };

  const resetCompletedIncidents = () => {
    setCompletedIncidents(new Set());
    setEmergencyCount(1);
    setFireCount(2);
    setTrashCount(7);
  };

  return (
    <IncidentCountContext.Provider value={{ 
      emergencyCount, 
      fireCount, 
      trashCount, 
      setEmergencyCount, 
      setFireCount, 
      setTrashCount,
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

