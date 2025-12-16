import React, { createContext, useContext, useState, useEffect } from 'react';

// 사용자 권한 타입 정의
export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

// 사용자 정보 인터페이스
export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  permissions: string[];
  email?: string;
}

// 권한별 메뉴 접근 권한
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    'main-map',
    'fire-dashboard',
    'emergency-dashboard',
    'trash-dashboard',
    'rockfall-dashboard',
    'all-incidents',
    'cctv-management',
    'statistics',
    'trend-analysis',
    'monthly-report',
    'settings',
    'users-management',
    'system-config',
  ],
  MANAGER: [
    'main-map',
    'fire-dashboard',
    'emergency-dashboard',
    'trash-dashboard',
    'rockfall-dashboard',
    'all-incidents',
    'cctv-management',
    'statistics',
    'trend-analysis',
    'monthly-report',
  ],
  OPERATOR: [
    'main-map',
    'fire-dashboard',
    'emergency-dashboard',
    'trash-dashboard',
    'rockfall-dashboard',
    'all-incidents',
  ],
  VIEWER: [
    'main-map',
    'fire-dashboard',
    'emergency-dashboard',
    'trash-dashboard',
    'rockfall-dashboard',
  ],
};

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // 로그인 상태 확인 (새로고침 시에도 유지)
  useEffect(() => {
    const storedUser = localStorage.getItem('ecoguard_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('ecoguard_user');
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // TODO: 실제 API 호출로 교체
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, password }),
      // });
      // const data = await response.json();

      // 임시 로그인 로직 (데모용)
      let role: UserRole = 'VIEWER';
      if (username === 'admin') role = 'ADMIN';
      else if (username === 'manager') role = 'MANAGER';
      else if (username === 'operator') role = 'OPERATOR';

      const loggedInUser: User = {
        id: `user-${Date.now()}`,
        username,
        name: username === 'admin' ? '관리자' : username === 'manager' ? '매니저' : username === 'operator' ? '운영자' : '열람자',
        role,
        permissions: ROLE_PERMISSIONS[role],
      };

      setUser(loggedInUser);
      localStorage.setItem('ecoguard_user', JSON.stringify(loggedInUser));
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('로그인에 실패했습니다.');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ecoguard_user');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        hasPermission,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



