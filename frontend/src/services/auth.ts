// Authentication API service
// Handles login, find ID, find password operations

import API_BASE_URL from '../config/api';

// ==================== Types ====================

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  loginId: string;
  name: string;
  role: string;
  dept: string;
  email: string;
  phone: string;
}

export interface FindIdRequest {
  name: string;
  email: string;
  phone: string;
}

export interface FindIdResponse {
  found: boolean;
  loginId?: string;
  message: string;
}

export interface FindPasswordRequest {
  loginId: string;
  email: string;
  phone: string;
}

export interface FindPasswordResponse {
  found: boolean;
  password?: string;
  message: string;
}

// ==================== API Functions ====================

/**
 * Login with ID and password
 * 
 * Backend: POST /api/auth/login
 * - Validates credentials with BCrypt
 * - Returns user information on success
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
  }

  const user = await response.json();
  
  // Save user info to localStorage
  localStorage.setItem('user', JSON.stringify(user));
  
  return user;
};

/**
 * Find login ID by name, email, and phone
 * 
 * Backend: POST /api/auth/find-id
 * - Returns login ID if match found
 */
export const findLoginId = async (data: FindIdRequest): Promise<FindIdResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/find-id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return await response.json();
};

/**
 * Find password by login ID, email, and phone
 * 
 * Backend: POST /api/auth/find-password
 * - Returns message if account found
 * - Note: BCrypt passwords cannot be decrypted
 */
export const findPassword = async (data: FindPasswordRequest): Promise<FindPasswordResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/find-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    return {
      found: false,
      message: '일치하는 정보가 없습니다.',
    };
  }

  return await response.json();
};

/**
 * Logout - clear user data from localStorage
 */
export const logout = () => {
  localStorage.removeItem('user');
};

/**
 * Get current logged-in user
 */
export const getCurrentUser = (): LoginResponse | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Check if user is logged in
 */
export const isLoggedIn = (): boolean => {
  return getCurrentUser() !== null;
};

