import { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onNavigate: (screen: string) => void;
}

export default function LoginScreen({ onNavigate }: LoginScreenProps) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    onNavigate('main-map');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100" style={{ backgroundColor: '#F5F7FA' }}>
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white p-10 shadow-lg" style={{ borderRadius: '0px' }}>
          {/* Logo and Title */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <Shield className="w-10 h-10 text-emerald-600" strokeWidth={2} />
            <h1 className="text-emerald-900">EcoGuard</h1>
          </div>

          {/* Input Fields */}
          <div className="space-y-6 mb-6">
            <div>
              <label className="block text-gray-700 mb-2">ID</label>
              <input
                type="text"
                placeholder="아이디를 입력하세요"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 shadow-sm focus:shadow-md transition-shadow outline-none focus:border-emerald-500"
                style={{ borderRadius: '0px' }}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">PW</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 shadow-sm focus:shadow-md transition-shadow outline-none focus:border-emerald-500 pr-12"
                  style={{ borderRadius: '0px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
            className="w-full px-4 py-3 bg-emerald-600 text-white shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all"
            style={{ borderRadius: '0px' }}
          >
            로그인
          </button>

          {/* Footer Text */}
          <p className="text-center text-gray-500 text-sm mt-6">
            관리자 전용 시스템입니다.
          </p>
        </div>
      </div>
    </div>
  );
}