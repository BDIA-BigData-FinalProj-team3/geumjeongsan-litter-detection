import { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';
import backgroundImage from 'figma:asset/ef94d1cbb3ccf439236036d868dca7a7dc644d8d.png';
import { useIncidentCount } from '../contexts/IncidentCountContext';

interface LoginScreenProps {
  onNavigate: (screen: string) => void;
}

export default function LoginScreen({ onNavigate }: LoginScreenProps) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { resetCompletedIncidents } = useIncidentCount();

  const handleLogin = () => {
    // 로그인 시 모든 데이터 초기화
    resetCompletedIncidents();
    // 첫 방문 플래그 제거 (로그인 시 사이드바가 닫힌 상태로 시작)
    sessionStorage.removeItem('visited-mainmap');
    onNavigate('main-map');
  };

  const handleFindId = () => {
    alert('아이디 찾기 기능은 관리자에게 문의하세요.');
  };

  const handleFindPassword = () => {
    alert('비밀번호 찾기 기능은 관리자에게 문의하세요.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-white">
      {/* Background Image with 50% opacity */}
      <div className="absolute inset-0">
        <img 
          src={backgroundImage}
          alt="Mountain Background"
          className="w-full h-full object-cover"
          style={{ opacity: 0.5 }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 px-4">
        {/* Login Card */}
        <div className="bg-white p-8 shadow-lg rounded-lg">
          {/* Logo and Title */}
          <div className="flex flex-col items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-gray-900">EcoGuard</h1>
              <p className="text-gray-600 text-sm">쓰레기 투기 모니터링 시스템</p>
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-gray-700 mb-2">아이디</label>
              <input
                type="text"
                placeholder="아이디를 입력하세요"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                style={{ borderRadius: '0px' }}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-10"
                  style={{ borderRadius: '0px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            className="w-full px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors mb-3"
            style={{ borderRadius: '0px' }}
          >
            로그인
          </button>

          {/* Find ID/Password Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleFindId}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm"
              style={{ borderRadius: '0px' }}
            >
              아이디 찾기
            </button>
            <button
              onClick={handleFindPassword}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm"
              style={{ borderRadius: '0px' }}
            >
              비밀번호 찾기
            </button>
          </div>

          {/* Footer Text */}
          <p className="text-center text-gray-500 text-sm mt-6">
            관리자 전용 시스템입니다.
          </p>
        </div>
      </div>
    </div>
  );
}