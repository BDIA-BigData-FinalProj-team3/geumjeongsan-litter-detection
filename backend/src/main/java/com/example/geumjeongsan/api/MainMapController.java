package com.example.geumjeongsan.api;

import com.example.geumjeongsan.domain.mainmap.MainMapIncidentMarker;
import com.example.geumjeongsan.domain.mainmap.MainMapIncidentMarkerRepository;
import com.example.geumjeongsan.domain.mainmap.MainMapCCTVStatus;
import com.example.geumjeongsan.domain.mainmap.MainMapCCTVStatusRepository;
import com.example.geumjeongsan.domain.mainmap.MainMapTrail;
import com.example.geumjeongsan.domain.mainmap.MainMapTrailRepository;
import com.example.geumjeongsan.domain.mainmap.RiskMapHeatmap;
import com.example.geumjeongsan.domain.mainmap.RiskMapHeatmapRepository;
import com.example.geumjeongsan.domain.weather.Weather;
import com.example.geumjeongsan.domain.weather.WeatherRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/mainmap")
@Slf4j
public class MainMapController {

    private final MainMapIncidentMarkerRepository incidentMarkerRepository;
    private final MainMapCCTVStatusRepository cctvStatusRepository;
    private final WeatherRepository weatherRepository;
    private final MainMapTrailRepository trailRepository;
    private final RiskMapHeatmapRepository riskMapHeatmapRepository;
    private final EntityManager entityManager;

    public MainMapController(
            MainMapIncidentMarkerRepository incidentMarkerRepository,
            MainMapCCTVStatusRepository cctvStatusRepository,
            WeatherRepository weatherRepository,
            MainMapTrailRepository trailRepository,
            RiskMapHeatmapRepository riskMapHeatmapRepository,
            EntityManager entityManager
    ) {
        this.incidentMarkerRepository = incidentMarkerRepository;
        this.cctvStatusRepository = cctvStatusRepository;
        this.weatherRepository = weatherRepository;
        this.trailRepository = trailRepository;
        this.riskMapHeatmapRepository = riskMapHeatmapRepository;
        this.entityManager = entityManager;
    }

    /**
     * 전체탐지 마커 조회
     * 
     * GET /api/mainmap/incident-markers
     * 
     * 용도: MainMap - 전체탐지 탭
     * VIEW: view_mainmap_incident_markers
     * 
     * 반환:
     * - CCTV 위치 (geom)
     * - 미처리 사건 개수 (fire_count, emergency_count, trash_count)
     * - 우선순위 타입 (top_incident_type)
     * - NEW 여부 (has_new)
     */
    @GetMapping("/incident-markers")
    public List<MainMapIncidentMarker> getIncidentMarkers() {
        log.info("📍 [MainMap] Fetching incident markers from VIEW");
        List<MainMapIncidentMarker> markers = incidentMarkerRepository.findAll();
        log.info("✅ [MainMap] Found {} incident markers", markers.size());
        return markers;
    }

    /**
     * 실시간 CCTV 상태 조회
     * 
     * GET /api/mainmap/cctv-status
     * 
     * 용도: MainMap - 실시간 CCTV 탭
     * VIEW: view_mainmap_cctv_status
     * 
     * 반환:
     * - CCTV 위치 (geom)
     * - 전원 상태 (power_status)
     * - 헬스 상태 (health_status)
     * - 표시 상태 (display_status: OFF/NEED_CHECK/ON)
     * - 최근 사건 정보
     */
    @GetMapping("/cctv-status")
    public List<MainMapCCTVStatus> getCCTVStatus() {
        log.info("📹 [MainMap] Fetching CCTV status from VIEW");
        List<MainMapCCTVStatus> statuses = cctvStatusRepository.findAll();
        log.info("✅ [MainMap] Found {} CCTV statuses", statuses.size());
        return statuses;
    }

    /**
     * 최신 날씨 정보 조회
     * 
     * GET /api/mainmap/weather
     * 
     * 용도: MainMap - 좌측 하단 날씨 위젯
     * 
     * 반환:
     * - 금정산 최신 날씨 정보
     * - 기온, 습도, 풍향, 풍속
     * - 날씨 상태 (CLEAR/CLOUDY/RAIN/SNOW)
     */
    @GetMapping("/weather")
    public Weather getWeather() {
        log.info("🌤️ [MainMap] Fetching latest weather for GEUMJEONG_SAN");
        Weather weather = weatherRepository
            .findFirstByLocationCodeOrderByObsTimeDesc("GEUMJEONG_SAN")
            .orElse(null);
        
        if (weather != null) {
            log.info("✅ [MainMap] Found weather: {}°C, {}", 
                weather.getTemperature(), weather.getWeatherCondition());
        } else {
            log.warn("⚠️ [MainMap] No weather data found");
        }
        
        return weather;
    }
    
    /**
     * 등산로 구간 조회
     * 
     * GET /api/mainmap/trails
     * 
     * 용도: MainMap - 등산로 표시
     * VIEW: view_mainmap_trail
     * 
     * 반환:
     * - 등산로 구간 정보 (segment_id, segment_name, trail_name_kor)
     * - LineString geometry (좌표 배열)
     */
    @GetMapping("/trails")
    public List<MainMapTrail> getTrails() {
        log.info("🥾 [MainMap] Fetching trail segments");
        try {
            List<MainMapTrail> trails = trailRepository.findAll();
            log.info("✅ [MainMap] Loaded {} trail segments", trails.size());
            return trails;
        } catch (Exception e) {
            log.error("❌ [MainMap] Failed to load trails: {}", e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }
    
    /**
     * 위험지도 히트맵 조회
     * 
     * GET /api/mainmap/risk-map/heatmap
     * 
     * 용도: MainMap - 위험지도 탭
     * VIEW: view_risk_map_heatmap
     * 
     * 파라미터:
     * - period: month|week|day|30d|7d|today (기간 선택)
     * - type: all|fire|emergency|trash (사건 타입 필터)
     * 
     * 반환:
     * - 등산로 구간별 사건 통계 (TRAIL_SEGMENT)
     * - CCTV별 사고다발 구간 통계 (CCTV)
     */
    @GetMapping("/risk-map/heatmap")
    public List<RiskMapHeatmap> getRiskMapHeatmap(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(defaultValue = "all") String type
    ) {
        log.info("🔥 [RiskMap] Fetching heatmap data - period: {}, type: {}", period, type);
        
        try {
            // 기간 계산
            OffsetDateTime startDate = calculateStartDate(period);
            // [수정] 미래 데이터(2025년 등)도 포함되도록 종료 시점을 1년 뒤로 설정
            OffsetDateTime endDate = OffsetDateTime.now().plusYears(1);
            
            log.info("📅 [RiskMap] Date range: {} ~ {}", startDate, endDate);
            log.info("📅 [RiskMap] Current time: {}", OffsetDateTime.now());
            
            // Native Query로 기간 필터링된 데이터 조회
            String sql = buildRiskMapHeatmapQuery(period, type);
            Query query = entityManager.createNativeQuery(sql, RiskMapHeatmap.class);
            query.setParameter("startDate", startDate);
            query.setParameter("endDate", endDate);
            
            @SuppressWarnings("unchecked")
            List<RiskMapHeatmap> results = query.getResultList();
            
            log.info("✅ [RiskMap] Found {} heatmap entries", results.size());
            
            // 디버깅: 샘플 데이터 로깅
            if (results.size() > 0) {
                RiskMapHeatmap sample = results.get(0);
                log.info("📋 [RiskMap] Sample entry: entityType={}, entityId={}, fireCount={}, emergencyCount={}, trashCount={}, totalCount={}", 
                    sample.getEntityType(), sample.getEntityId(), 
                    sample.getFireCount(), sample.getEmergencyCount(), 
                    sample.getTrashCount(), sample.getTotalCount());
            }
            
            // 디버깅: 카운트가 0이 아닌 항목 개수
            long nonZeroCount = results.stream()
                .filter(r -> (r.getFireCount() != null && r.getFireCount() > 0) ||
                            (r.getEmergencyCount() != null && r.getEmergencyCount() > 0) ||
                            (r.getTrashCount() != null && r.getTrashCount() > 0))
                .count();
            log.info("📊 [RiskMap] Entries with non-zero counts: {}", nonZeroCount);
            
            return results;
            
        } catch (Exception e) {
            log.error("❌ [RiskMap] Failed to load heatmap: {}", e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }
    
    /**
     * 기간에 따른 시작 날짜 계산
     */
    private OffsetDateTime calculateStartDate(String period) {
        LocalDate today = LocalDate.now();
        OffsetDateTime startDate;
        
        switch (period.toLowerCase()) {
            case "month":
                // 이번 달 1일 00:00
                YearMonth currentMonth = YearMonth.now();
                startDate = currentMonth.atDay(1).atStartOfDay()
                    .atOffset(java.time.ZoneOffset.of("+09:00"));
                break;
            case "week":
                // 이번 주 월요일 00:00
                int dayOfWeek = today.getDayOfWeek().getValue(); // 1=월요일, 7=일요일
                startDate = today.minusDays(dayOfWeek - 1).atStartOfDay()
                    .atOffset(java.time.ZoneOffset.of("+09:00"));
                break;
            case "day":
            case "today":
                // 오늘 00:00
                startDate = today.atStartOfDay()
                    .atOffset(java.time.ZoneOffset.of("+09:00"));
                break;
            case "30d":
                // 최근 30일 (오늘 포함 30일)
                startDate = today.minusDays(29).atStartOfDay()
                    .atOffset(java.time.ZoneOffset.of("+09:00"));
                break;
            case "7d":
                // 최근 7일 (오늘 포함 7일)
                startDate = today.minusDays(6).atStartOfDay()
                    .atOffset(java.time.ZoneOffset.of("+09:00"));
                break;
            default:
                // 기본값: 이번 달
                YearMonth defaultMonth = YearMonth.now();
                startDate = defaultMonth.atDay(1).atStartOfDay()
                    .atOffset(java.time.ZoneOffset.of("+09:00"));
        }
        
        return startDate;
    }
    
    /**
     * 기간 및 타입 필터링을 포함한 Native Query 생성
     */
    private String buildRiskMapHeatmapQuery(String period, String type) {
        StringBuilder sql = new StringBuilder();
        
        // view_risk_map_heatmap 를 기반으로 등산로(TRAIL_SEGMENT)와 CCTV 모두에 대해
        // incident / cctv_info 를 이용해 기간별 사건 카운트를 다시 계산한다.
        // 하나의 incident 가 등산로/카메라 양쪽에 모두 집계되도록 UNION ALL 사용
        sql.append("""
            SELECT 
                h.entity_type,
                h.entity_id,
                h.entity_name,
                h.trail_name,
                h.cctv_code,
                h.cctv_address,
                h.geom,
                COUNT(CASE WHEN i.incident_type = 'FIRE' 
                     THEN 1 END) as fire_count,
                COUNT(CASE WHEN i.incident_type = 'EMERGENCY' 
                     THEN 1 END) as emergency_count,
                COUNT(CASE WHEN i.incident_type = 'TRASH' 
                     THEN 1 END) as trash_count,
                COUNT(i.incident_id) as total_count
            FROM view_risk_map_heatmap h
            LEFT JOIN (
                -- 등산로 기준 집계
                SELECT 
                    'TRAIL_SEGMENT' as entity_type,
                    ci.segment_id as entity_id,
                    i.incident_id,
                    i.incident_type,
                    i.detected_at
                FROM incident i
                JOIN cctv_info ci ON i.cctv_id = ci.cctv_id
                WHERE ci.segment_id IS NOT NULL
                
                UNION ALL
                
                -- CCTV 기준 집계
                SELECT 
                    'CCTV' as entity_type,
                    ci.cctv_id as entity_id,
                    i.incident_id,
                    i.incident_type,
                    i.detected_at
                FROM incident i
                JOIN cctv_info ci ON i.cctv_id = ci.cctv_id
            ) i ON (
                h.entity_type = i.entity_type
                AND h.entity_id = i.entity_id
            )
            AND i.detected_at >= :startDate 
            AND i.detected_at <= :endDate
            GROUP BY h.entity_type, h.entity_id, h.entity_name, h.trail_name, 
                     h.cctv_code, h.cctv_address, h.geom
            """);

        return sql.toString();
    }
}

