# Services Layer - API & Data Management

이 폴더는 애플리케이션의 데이터 레이어를 관리합니다.

## 📁 파일 구조

### `common.ts` - CCTV 데이터 단일 원천 (Single Source of Truth)
- **목적**: 모든 CCTV 관련 데이터를 중앙에서 관리
- **주요 데이터**:
  - `cctvList`: 모든 CCTV의 마스터 리스트 (위치, 전원상태, 발생사고)
  - `cctvSummary`: 자동 계산된 CCTV 통계 (총 대수, ON/OFF 개수)
  - `incidentsSummary`: 사고 요약 (화재/응급/쓰레기 건수)
  - `fireHotspots`, `emergencyHotspots`, `trashHotspots`: 사고다발구간 위치
- **Helper 함수**:
  - `getCCTVById()`: ID로 CCTV 조회
  - `getCCTVLocation()`: CCTV 위치명 조회
  - `getCCTVsWithIncidents()`: 사고 발생 중인 CCTV 필터링
  - `getHotspotsByType()`: 사고 유형별 다발구간 조회

### `mock.ts` - 대시보드 통계 더미데이터
- **목적**: 대시보드, 리포트용 통계 데이터 제공
- **주요 데이터**:
  - `mockFireNotifications`, `mockEmergencyNotifications`, `mockTrashNotifications`: 알림 데이터
  - `mockAllMonthlyData`: 월별 사고 통계 (8월~12월)
  - `mockAvgResponseTime`: 평균 대응시간 추이
  - `mockInitialActive*`, `mockCompleted*`: 각 대시보드별 사고 목록
  - `mockMonthlyStats`: 월간 보고서용 통계
  - `mockMajorIncidents`: 주요 사건 목록

### `api.ts` - API 서비스 레이어
- **목적**: 백엔드 API 호출을 캡슐화하고 일관된 인터페이스 제공
- **현재**: mock 데이터를 Promise로 반환
- **향후**: 실제 백엔드 fetch() 호출로 교체

## 🔄 백엔드 연동 가이드

### 1단계: common.ts의 cctvList를 DB에서 가져오기
```typescript
// common.ts
export const cctvList = await fetch('/api/cctv/list').then(res => res.json());
// 모든 페이지가 자동으로 업데이트됩니다
```

### 2단계: api.ts의 각 함수를 실제 API로 교체
```typescript
// Before (Mock)
export const getActiveEmergencies = async () => {
  return Promise.resolve(mockInitialActiveEmergencies);
};

// After (Real API)
export const getActiveEmergencies = async () => {
  return fetch('/api/emergencies?status=active').then(res => res.json());
};
```

### 3단계: 각 API 함수의 JSDoc 주석 참고
- 각 함수에는 백엔드 연동 시 필요한 엔드포인트와 파라미터가 주석으로 명시되어 있습니다
- 필터링, 정렬, 페이지네이션 등의 요구사항도 포함되어 있습니다

## 📊 데이터 흐름

```
DB/Backend API
    ↓
api.ts (서비스 레이어)
    ↓
Pages (MainMap, Dashboard, etc.)
    ↓
Components (차트, 테이블, 카드 등)
```

## 🎯 주요 API 엔드포인트 (향후 구현)

### CCTV 관련
- `GET /api/cctv/list` - 전체 CCTV 목록 및 상태
- `GET /api/cctv/{id}` - 특정 CCTV 상세정보

### 사고 관련
- `GET /api/fires?status={active|completed}` - 화재 목록
- `GET /api/emergencies?status={active|completed}` - 응급 목록
- `GET /api/trash?status={active|completed}` - 쓰레기 목록

### 알림 관련
- `GET /api/notifications/{type}` - 실시간 알림 (type: fire|emergency|trash)

### 통계 관련
- `GET /api/dashboard/daily-stats` - 당일 통계
- `GET /api/dashboard/monthly-data?start=YYYY-MM&end=YYYY-MM` - 기간별 통계
- `GET /api/dashboard/avg-response-time` - 평균 대응시간

### 사고다발구간
- `GET /api/hotspots?type={type}&month=YYYY-MM` - 사고다발구간 위치

### 월간 보고서
- `GET /api/reports/monthly-stats?month=YYYY-MM` - 월간 통계
- `GET /api/reports/major-incidents?month=YYYY-MM` - 주요 사건

## ⚠️ 주의사항

1. **cctvList는 반드시 common.ts에서만 수정**
   - 다른 파일에서 직접 수정하지 말 것
   - 모든 페이지가 이 데이터를 참조합니다

2. **api.ts의 함수만 페이지에서 호출**
   - mock.ts를 직접 import하지 말 것
   - 항상 api.ts를 통해 데이터 접근

3. **타입 정의는 mock.ts와 common.ts에 유지**
   - interface와 type은 재사용 가능하도록 export

4. **에러 핸들링 추가 필요**
   - 현재는 성공 케이스만 구현
   - 실제 API 연동 시 try-catch와 에러 처리 추가 필요


