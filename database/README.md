# 데이터베이스 VIEW 설정 가이드

## 문제 상황
대시보드에서 **월평균 처리시간**이 표시되지 않는 문제가 발생했습니다.

## 원인
필요한 데이터베이스 VIEW가 생성되지 않았습니다:
1. `vw_incident_summary` - 사건 요약 정보 VIEW
2. `view_all_incidents_avg_response_time` - 월평균 처리시간 VIEW

## 해결 방법

### 1. 데이터베이스 접속

PostgreSQL에 접속합니다:

```bash
# psql 접속 (데이터베이스 이름과 사용자명은 환경에 맞게 수정)
psql -U postgres -d geumjeongsan
```

또는 DBeaver, pgAdmin 등의 GUI 도구를 사용할 수 있습니다.

### 2. VIEW 생성

다음 순서대로 SQL 스크립트를 실행합니다:

#### Step 1: `vw_incident_summary` VIEW 생성

```bash
# psql에서 실행
\i C:/Users/kmk/final_project/database/create_vw_incident_summary.sql
```

또는 SQL 파일 내용을 직접 복사하여 실행:

```sql
-- database/create_vw_incident_summary.sql 파일 내용을 실행
CREATE OR REPLACE VIEW vw_incident_summary AS ...
```

#### Step 2: `view_all_incidents_avg_response_time` VIEW 생성

```bash
# psql에서 실행
\i C:/Users/kmk/final_project/database/create_view_all_incidents_avg_response_time.sql
```

또는 SQL 파일 내용을 직접 복사하여 실행:

```sql
-- database/create_view_all_incidents_avg_response_time.sql 파일 내용을 실행
CREATE OR REPLACE VIEW view_all_incidents_avg_response_time AS ...
```

### 3. VIEW 생성 확인

VIEW가 정상적으로 생성되었는지 확인합니다:

```sql
-- VIEW 목록 확인
\dv

-- VIEW 데이터 확인
SELECT * FROM vw_incident_summary LIMIT 5;
SELECT * FROM view_all_incidents_avg_response_time;
```

### 4. 백엔드 재시작

VIEW 생성 후 백엔드 애플리케이션을 재시작합니다:

```bash
# Spring Boot 재시작
cd backend
./gradlew bootRun
```

### 5. 확인

대시보드(`/all-incidents`)에 접속하여 **월 평균 처리 시간** 카드에 데이터가 표시되는지 확인합니다.

## 트러블슈팅

### VIEW 생성 실패 시

1. **테이블이 없다는 오류가 발생하는 경우:**
   ```
   ERROR: relation "incident" does not exist
   ```
   → `incident`, `incident_action` 테이블이 먼저 생성되어 있어야 합니다.

2. **컬럼이 없다는 오류가 발생하는 경우:**
   ```
   ERROR: column "acknowledged_at" does not exist
   ```
   → `incident_action` 테이블에 `acknowledged_at`, `resolved_at` 컬럼이 있어야 합니다.

3. **데이터가 0으로 표시되는 경우:**
   - 당월에 처리완료된 사건이 없을 수 있습니다
   - `incident_action` 테이블에 `resolved_at` 데이터가 없을 수 있습니다

### 수동 쿼리로 데이터 확인

```sql
-- 당월 완료된 사건 확인
SELECT 
    i.incident_id,
    i.detected_at,
    ia.resolved_at,
    EXTRACT(EPOCH FROM (ia.resolved_at - i.detected_at))::INTEGER AS response_seconds
FROM incident i
JOIN incident_action ia ON ia.incident_id = i.incident_id
WHERE ia.resolved_at IS NOT NULL
  AND EXTRACT(YEAR FROM i.detected_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM i.detected_at) = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY i.detected_at DESC;

-- 월평균 처리시간 계산
SELECT 
    AVG(EXTRACT(EPOCH FROM (ia.resolved_at - i.detected_at))) / 60.0 AS avg_minutes
FROM incident i
JOIN incident_action ia ON ia.incident_id = i.incident_id
WHERE ia.resolved_at IS NOT NULL
  AND EXTRACT(YEAR FROM i.detected_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM i.detected_at) = EXTRACT(MONTH FROM CURRENT_DATE);
```

## 참고

- **VIEW 정의 파일:**
  - `database/create_vw_incident_summary.sql`
  - `database/create_view_all_incidents_avg_response_time.sql`

- **백엔드 코드:**
  - `backend/src/main/java/com/example/geumjeongsan/domain/dashboard/AvgResponseTimeRepository.java`
  - `backend/src/main/java/com/example/geumjeongsan/api/dto/AllIncidentsStatsDto.java`

- **프론트엔드 코드:**
  - `frontend/src/pages/AllIncidentsDashboard.tsx` (620-626번 라인)
  - `frontend/src/services/api.ts` (getAllIncidentsStats 함수)

