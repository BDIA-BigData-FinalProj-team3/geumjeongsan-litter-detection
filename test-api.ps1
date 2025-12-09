# 백엔드 API 테스트 스크립트
Write-Host "=== 백엔드 API 테스트 ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"

# 1. 헬스 체크
Write-Host "`n1. 헬스 체크" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/actuator/health" -Method GET
    Write-Host "✓ 백엔드 실행 중: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ 백엔드가 실행되지 않았습니다. ./gradlew bootRun 실행 후 다시 시도하세요." -ForegroundColor Red
    exit 1
}

# 2. CCTV 목록 조회 (lastIncidentTime, lastIncidentType 포함 확인)
Write-Host "`n2. CCTV 목록 조회" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/cctv" -Method GET
    $cctvList = $response.Content | ConvertFrom-Json
    Write-Host "✓ CCTV 개수: $($cctvList.Count)" -ForegroundColor Green
    if ($cctvList.Count -gt 0) {
        $first = $cctvList[0]
        Write-Host "  - 첫 번째 CCTV: $($first.cctvCode)" -ForegroundColor Cyan
        Write-Host "  - lastIncidentTime: $($first.lastIncidentTime)" -ForegroundColor Cyan
        Write-Host "  - lastIncidentType: $($first.lastIncidentType)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ CCTV 목록 조회 실패: $_" -ForegroundColor Red
}

# 3. 지도 데이터 조회 (detectionModel, detectionConfidence 포함 확인)
Write-Host "`n3. 지도 데이터 조회" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/map/data" -Method GET
    $mapData = $response.Content | ConvertFrom-Json
    Write-Host "✓ 지도 데이터 조회 성공" -ForegroundColor Green
    Write-Host "  - CCTV 마커: $($mapData.cctvMarkers.Count)" -ForegroundColor Cyan
    Write-Host "  - 사건 마커: $($mapData.incidentMarkers.Count)" -ForegroundColor Cyan
    if ($mapData.incidentMarkers.Count -gt 0) {
        $firstIncident = $mapData.incidentMarkers[0]
        Write-Host "  - 첫 번째 사건:" -ForegroundColor Cyan
        Write-Host "    * detectionModel: $($firstIncident.detectionModel)" -ForegroundColor Cyan
        Write-Host "    * detectionConfidence: $($firstIncident.detectionConfidence)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ 지도 데이터 조회 실패: $_" -ForegroundColor Red
}

# 4. 화재 대시보드 조회 (기상청 API 연동 확인)
Write-Host "`n4. 화재 대시보드 조회" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/fires/dashboard" -Method GET
    $fireDashboard = $response.Content | ConvertFrom-Json
    Write-Host "✓ 화재 대시보드 조회 성공" -ForegroundColor Green
    Write-Host "  - 당일 발생 건수: $($fireDashboard.todayCount)" -ForegroundColor Cyan
    Write-Host "  - 처리 대기중: $($fireDashboard.pendingCount)" -ForegroundColor Cyan
    Write-Host "  - 현재 풍속: $($fireDashboard.currentWindSpeed)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ 화재 대시보드 조회 실패: $_" -ForegroundColor Red
}

# 5. CCTV별 사건 조회 (새 엔드포인트)
Write-Host "`n5. CCTV별 사건 조회 (CCTV ID=1)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/cctv/1/incidents" -Method GET
    $incidents = $response.Content | ConvertFrom-Json
    Write-Host "✓ CCTV별 사건 조회 성공: $($incidents.Count)건" -ForegroundColor Green
    if ($incidents.Count -gt 0) {
        $first = $incidents[0]
        Write-Host "  - 첫 번째 사건:" -ForegroundColor Cyan
        Write-Host "    * incidentType: $($first.incidentType)" -ForegroundColor Cyan
        Write-Host "    * detectionModel: $($first.detectionModel)" -ForegroundColor Cyan
        Write-Host "    * detectionConfidence: $($first.detectionConfidence)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ CCTV별 사건 조회 실패: $_" -ForegroundColor Red
}

# 6. CCTV별 미디어 조회 (새 엔드포인트)
Write-Host "`n6. CCTV별 미디어 조회 (CCTV ID=1)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/cctv/1/media" -Method GET
    $media = $response.Content | ConvertFrom-Json
    Write-Host "✓ CCTV별 미디어 조회 성공: $($media.Count)개" -ForegroundColor Green
    if ($media.Count -gt 0) {
        $first = $media[0]
        Write-Host "  - 첫 번째 미디어:" -ForegroundColor Cyan
        Write-Host "    * fileType: $($first.fileType)" -ForegroundColor Cyan
        Write-Host "    * url: $($first.url)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ CCTV별 미디어 조회 실패: $_" -ForegroundColor Red
}

# 7. CCTV별 미디어 조회 (파일 타입 필터링)
Write-Host "`n7. CCTV별 미디어 조회 (THUMBNAIL만)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/cctv/1/media?fileType=THUMBNAIL" -Method GET
    $media = $response.Content | ConvertFrom-Json
    Write-Host "✓ THUMBNAIL 조회 성공: $($media.Count)개" -ForegroundColor Green
} catch {
    Write-Host "✗ THUMBNAIL 조회 실패: $_" -ForegroundColor Red
}

# 8. 응급환자 기록 CRUD 테스트
Write-Host "`n8. 응급환자 기록 CRUD 테스트" -ForegroundColor Yellow
try {
    # 조회
    $response = Invoke-WebRequest -Uri "$baseUrl/api/emergencies" -Method GET
    $emergencies = $response.Content | ConvertFrom-Json
    Write-Host "✓ 응급환자 기록 조회 성공: $($emergencies.Count)건" -ForegroundColor Green
    
    # 신규 등록 테스트는 수동으로 프론트엔드에서 진행하세요.
    Write-Host "  - 신규 등록 테스트는 수동으로 프론트엔드에서 진행하세요." -ForegroundColor Cyan
} catch {
    Write-Host "✗ 응급환자 기록 조회 실패: $_" -ForegroundColor Red
}

Write-Host "`n=== 테스트 완료 ===" -ForegroundColor Green

