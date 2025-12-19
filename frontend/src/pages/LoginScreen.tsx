import React, { useState } from 'react';
import { Shield, Eye, EyeOff, X, Mail, User, Phone } from 'lucide-react';
import backgroundImage from 'figma:asset/ef94d1cbb3ccf439236036d868dca7a7dc644d8d.png';
import { useIncidentCount } from '../contexts/IncidentCountContext';
import * as authService from '../services/auth';

interface LoginScreenProps {
  onNavigate: (screen: string) => void;
}

export default function LoginScreen({ onNavigate }: LoginScreenProps) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { resetCompletedIncidents } = useIncidentCount();

  // 모달 상태
  const [showFindIdModal, setShowFindIdModal] = useState(false);
  const [showFindPasswordModal, setShowFindPasswordModal] = useState(false);

  // 아이디 찾기 입력값
  const [findIdName, setFindIdName] = useState('');
  const [findIdEmail, setFindIdEmail] = useState('');
  const [findIdPhone, setFindIdPhone] = useState('');
  const [findIdResult, setFindIdResult] = useState('');

  // 비밀번호 찾기 입력값
  const [findPwId, setFindPwId] = useState('');
  const [findPwEmail, setFindPwEmail] = useState('');
  const [findPwPhone, setFindPwPhone] = useState('');
  const [findPwResult, setFindPwResult] = useState('');

  const handleLogin = async () => {
    // 에러 메시지 초기화
    setLoginError('');

    // 입력값 검증
    if (!id) {
      setLoginError('아이디를 입력해 주세요.');
      return;
    }
    
    if (!password) {
      setLoginError('비밀번호를 입력해 주세요.');
      return;
    }

    try {
      // 실제 백엔드 API 호출
      const user = await authService.login({
        loginId: id,
        password: password
      });
      
      console.log('로그인 성공:', user);
      
      // Sidebar에 로그인 상태 변경 알림
      window.dispatchEvent(new CustomEvent('userLogin'));
      
      // 로그인 시 모든 데이터 초기화
      resetCompletedIncidents();
      // 첫 방문 플래그 제거 (로그인 시 사이드바가 닫힌 상태로 시작)
      sessionStorage.removeItem('visited-mainmap');
      onNavigate('main-map');
    } catch (error) {
      console.error('로그인 실패:', error);
      
      // 에러 상세 메시지 처리
      if (error instanceof Error) {
        if (error.message.includes('아이디') || error.message.includes('비밀번호')) {
          setLoginError('등록되지 않은 아이디이거나 아이디 또는 비밀번호를 잘못 입력했습니다.');
        } else {
          setLoginError('일시적인 오류로 로그인을 할 수 없습니다. 잠시 후 다시 이용해 주세요.');
        }
      } else {
        setLoginError('등록되지 않은 아이디이거나 아이디 또는 비밀번호를 잘못 입력했습니다.');
      }
    }
  };

  const handleFindId = () => {
    setShowFindIdModal(true);
    setFindIdResult('');
  };

  const handleFindPassword = () => {
    setShowFindPasswordModal(true);
    setFindPwResult('');
  };

  const submitFindId = async () => {
    if (!findIdName || !findIdEmail || !findIdPhone) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      // 실제 백엔드 API 호출
      const response = await authService.findLoginId({
        name: findIdName,
        email: findIdEmail,
        phone: findIdPhone
      });
      
      if (response.found && response.loginId) {
        setFindIdResult(response.loginId);
      } else {
        setFindIdResult('일치하는 정보가 없습니다.');
      }
    } catch (error) {
      console.error('아이디 찾기 실패:', error);
      setFindIdResult('일치하는 정보가 없습니다.');
    }
  };

  const submitFindPassword = async () => {
    if (!findPwId || !findPwEmail || !findPwPhone) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      // 실제 백엔드 API 호출
      const response = await authService.findPassword({
        loginId: findPwId,
        email: findPwEmail,
        phone: findPwPhone
      });
      
      setFindPwResult(response.message);
    } catch (error) {
      console.error('비밀번호 찾기 실패:', error);
      setFindPwResult('일치하는 정보가 없습니다.');
    }
  };

  const closeFindIdModal = () => {
    setShowFindIdModal(false);
    setFindIdName('');
    setFindIdEmail('');
    setFindIdPhone('');
    setFindIdResult('');
  };

  const closeFindPasswordModal = () => {
    setShowFindPasswordModal(false);
    setFindPwId('');
    setFindPwEmail('');
    setFindPwPhone('');
    setFindPwResult('');
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
              <h1 className="text-gray-900 leading-tight">
                Geumjeong<br />Sentinel
              </h1>
              <p className="text-gray-600 text-sm">금정산 국립공원 탐지현황 관리자 대시보드</p>
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
                onChange={(e) => {
                  setId(e.target.value);
                  setLoginError(''); // 입력 시 에러 메시지 제거
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError(''); // 입력 시 에러 메시지 제거
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-10"
                  style={{ 
                    borderRadius: '0px',
                    fontFamily: showPassword ? '' : 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans KR", sans-serif',
                    fontWeight: showPassword ? '' : 400
                  }}
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

          {/* Error Message */}
          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm" style={{ borderRadius: '0px' }}>
              {loginError}
            </div>
          )}

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

      {/* 아이디 찾기 모달 */}
      {showFindIdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-md shadow-xl" style={{ borderRadius: '0px' }}>
            {/* 모달 헤더 */}
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold">아이디 찾기</h2>
              </div>
              <button
                onClick={closeFindIdModal}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              {!findIdResult ? (
                <>
                  <p className="text-gray-600 text-sm mb-6">
                    등록된 정보를 입력하시면 아이디를 찾아드립니다.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 mb-2 text-sm">이름</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="이름을 입력하세요"
                          value={findIdName}
                          onChange={(e) => setFindIdName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          style={{ borderRadius: '0px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 text-sm">이메일</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          placeholder="이메일을 입력하세요"
                          value={findIdEmail}
                          onChange={(e) => setFindIdEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          style={{ borderRadius: '0px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 text-sm">전화번호</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="전화번호를 입력하세요 (- 제외)"
                          value={findIdPhone}
                          onChange={(e) => setFindIdPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          style={{ borderRadius: '0px' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={closeFindIdModal}
                      className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      취소
                    </button>
                    <button
                      onClick={submitFindId}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      확인
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {findIdResult === '일치하는 정보가 없습니다.' ? (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-red-500" />
                      </div>
                      <p className="text-gray-700 mb-2">일치하는 정보가 없습니다.</p>
                      <p className="text-gray-500 text-sm">입력하신 정보를 다시 확인해주세요.</p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-emerald-600" />
                      </div>
                      <p className="text-gray-700 mb-2">회원님의 아이디는</p>
                      <p className="text-2xl font-bold text-emerald-600 mb-4">{findIdResult}</p>
                      <p className="text-gray-500 text-sm">입니다.</p>
                    </div>
                  )}

                  <button
                    onClick={closeFindIdModal}
                    className="w-full px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors mt-4"
                    style={{ borderRadius: '0px' }}
                  >
                    확인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 찾기 모달 */}
      {showFindPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-md shadow-xl" style={{ borderRadius: '0px' }}>
            {/* 모달 헤더 */}
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold">비밀번호 찾기</h2>
              </div>
              <button
                onClick={closeFindPasswordModal}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              {!findPwResult ? (
                <>
                  <p className="text-gray-600 text-sm mb-6">
                    등록된 정보를 입력하시면 임시 비밀번호를 이메일로 발송해드립니다.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 mb-2 text-sm">아이디</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="아이디를 입력하세요"
                          value={findPwId}
                          onChange={(e) => setFindPwId(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          style={{ borderRadius: '0px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 text-sm">이메일</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          placeholder="이메일을 입력하세요"
                          value={findPwEmail}
                          onChange={(e) => setFindPwEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          style={{ borderRadius: '0px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 text-sm">전화번호</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="전화번호를 입력하세요 (- 제외)"
                          value={findPwPhone}
                          onChange={(e) => setFindPwPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          style={{ borderRadius: '0px' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={closeFindPasswordModal}
                      className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      취소
                    </button>
                    <button
                      onClick={submitFindPassword}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      확인
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {findPwResult === '일치하는 정보가 없습니다.' ? (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-red-500" />
                      </div>
                      <p className="text-gray-700 mb-2">일치하는 정보가 없습니다.</p>
                      <p className="text-gray-500 text-sm">입력하신 정보를 다시 확인해주세요.</p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-emerald-600" />
                      </div>
                      <p className="text-gray-700 mb-2 font-semibold">임시 비밀번호 발송 완료</p>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        입력하신 이메일로<br />
                        임시 비밀번호가 발송되었습니다.<br />
                        로그인 후 비밀번호를 변경해주세요.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={closeFindPasswordModal}
                    className="w-full px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors mt-4"
                    style={{ borderRadius: '0px' }}
                  >
                    확인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}