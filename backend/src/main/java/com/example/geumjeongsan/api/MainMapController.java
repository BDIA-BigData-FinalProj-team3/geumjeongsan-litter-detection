package com.example.geumjeongsan.api;

import com.example.geumjeongsan.domain.mainmap.MainMapIncidentMarker;
import com.example.geumjeongsan.domain.mainmap.MainMapIncidentMarkerRepository;
import com.example.geumjeongsan.domain.mainmap.MainMapCCTVStatus;
import com.example.geumjeongsan.domain.mainmap.MainMapCCTVStatusRepository;
import com.example.geumjeongsan.domain.weather.Weather;
import com.example.geumjeongsan.domain.weather.WeatherRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/mainmap")
@Slf4j
public class MainMapController {

    private final MainMapIncidentMarkerRepository incidentMarkerRepository;
    private final MainMapCCTVStatusRepository cctvStatusRepository;
    private final WeatherRepository weatherRepository;

    public MainMapController(
            MainMapIncidentMarkerRepository incidentMarkerRepository,
            MainMapCCTVStatusRepository cctvStatusRepository,
            WeatherRepository weatherRepository
    ) {
        this.incidentMarkerRepository = incidentMarkerRepository;
        this.cctvStatusRepository = cctvStatusRepository;
        this.weatherRepository = weatherRepository;
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
}

